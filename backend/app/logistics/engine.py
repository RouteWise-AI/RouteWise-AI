"""
RouteWise AI - Deterministic Logistics Decision Engine
Pure mathematical and rule-based evaluation of transit options, costs, deadlines, and disruptions.
Independent of AI model predictions.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from .models import (
    ComparisonResult,
    ConstraintCheckResult,
    CostBreakdown,
    DeadlineEvaluation,
    DeadlineStatus,
    DisruptionDetails,
    EvaluatedOption,
    JourneyOption,
    PriorityGoal,
    ReplanningResult,
    ShipmentDetails,
    ShipmentType,
    TransportMode,
)
from .sample_data import SAMPLE_JOURNEY_OPTIONS, get_options_for_route

# Mode-based per-kg surcharges above base allowance (5 kg)
PER_KG_RATES = {
    TransportMode.AIR: 65.0,
    TransportMode.EXPRESS_ROAD: 18.0,
    TransportMode.RAIL: 15.0,
    TransportMode.ROAD: 10.0,
}

# Special handling surcharges in INR
HANDLING_SURCHARGES = {
    ShipmentType.STANDARD: 0.0,
    ShipmentType.EXPRESS: 100.0,
    ShipmentType.FRAGILE: 180.0,
    ShipmentType.PERISHABLE: 260.0,
    ShipmentType.DOCUMENT: 40.0,
}

# Standard reference time: Today 08:00 AM IST (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))


def _parse_time_to_datetime(time_str: str, base_date: Optional[datetime] = None) -> datetime:
    """Parse 'HH:MM' string into a full timezone-aware datetime on base_date."""
    now_ist = datetime.now(IST)
    if base_date is None:
        base_date = datetime(now_ist.year, now_ist.month, now_ist.day, tzinfo=IST)
    
    parts = time_str.strip().split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return base_date.replace(hour=hours, minute=minutes, second=0, microsecond=0)


def calculate_delivery_cost(
    option: JourneyOption,
    weight_kg: float = 5.0,
    shipment_type: ShipmentType = ShipmentType.STANDARD,
    declared_value_inr: Optional[float] = None,
    disruption_cost_inr: float = 0.0,
) -> CostBreakdown:
    """Calculate explicit cost breakdown with itemized surcharges."""
    if weight_kg <= 0:
        raise ValueError("Package weight must be greater than 0 kg")

    base = option.base_cost_inr
    notes = [f"Base tariff for corridor {option.origin} -> {option.destination} ({option.mode.value}): ₹{base:,.2f}"]

    # Weight surcharge for weight above 5kg allowance
    weight_surcharge = 0.0
    if weight_kg > 5.0:
        excess_kg = weight_kg - 5.0
        rate = PER_KG_RATES.get(option.mode, 15.0)
        weight_surcharge = round(excess_kg * rate, 2)
        notes.append(f"Excess weight fee ({excess_kg:.1f} kg over 5 kg allowance @ ₹{rate}/kg): ₹{weight_surcharge:,.2f}")

    # Handling surcharge
    handling_surcharge = HANDLING_SURCHARGES.get(shipment_type, 0.0)
    if handling_surcharge > 0:
        notes.append(f"Special handling fee for {shipment_type.value}: ₹{handling_surcharge:,.2f}")

    # Declared value cargo protection (0.5% for value > ₹10,000)
    if declared_value_inr and declared_value_inr > 10000.0:
        value_fee = round(declared_value_inr * 0.005, 2)
        handling_surcharge += value_fee
        notes.append(f"Transit cargo insurance on declared ₹{declared_value_inr:,.2f} (0.5%): ₹{value_fee:,.2f}")

    if disruption_cost_inr > 0:
        notes.append(f"Disruption / expedite adjustment: ₹{disruption_cost_inr:,.2f}")

    total = round(base + weight_surcharge + handling_surcharge + disruption_cost_inr, 2)
    notes.append(f"Total calculated estimated cost: ₹{total:,.2f}")

    return CostBreakdown(
        base_cost_inr=base,
        weight_surcharge_inr=weight_surcharge,
        handling_surcharge_inr=handling_surcharge,
        disruption_cost_inr=disruption_cost_inr,
        total_cost_inr=total,
        currency="INR",
        calculation_notes=notes,
    )


def check_delivery_deadline(
    departure_time_str: str,
    duration_hours: float,
    deadline_hours: float,
    reference_date: Optional[datetime] = None,
) -> DeadlineEvaluation:
    """Evaluate whether arrival time satisfies the required deadline window."""
    if duration_hours <= 0:
        raise ValueError("Duration hours must be strictly positive")
    if deadline_hours <= 0:
        raise ValueError("Deadline hours must be strictly positive")

    dep_dt = _parse_time_to_datetime(departure_time_str, reference_date)
    arr_dt = dep_dt + timedelta(hours=duration_hours)
    deadline_dt = dep_dt + timedelta(hours=deadline_hours)

    margin_hours = round(deadline_hours - duration_hours, 2)
    is_feasible = margin_hours >= 0.0

    if margin_hours >= 1.0:
        status = DeadlineStatus.ON_TIME
        notes = f"Schedules arrival {margin_hours:.1f} hrs ahead of deadline. Ample safety buffer."
    elif margin_hours >= 0.0:
        status = DeadlineStatus.AT_RISK
        notes = f"Arrives with only {margin_hours * 60:.0f} mins margin. Vulnerable to minor transit bottlenecks."
    else:
        status = DeadlineStatus.LATE
        notes = f"Expected arrival misses deadline by {abs(margin_hours):.1f} hrs ({abs(margin_hours) * 60:.0f} mins late)."

    return DeadlineEvaluation(
        departure_time=dep_dt.strftime("%Y-%m-%d %H:%M IST"),
        estimated_duration_hours=round(duration_hours, 2),
        estimated_arrival_time=arr_dt.strftime("%Y-%m-%d %H:%M IST"),
        required_deadline=deadline_dt.strftime("%Y-%m-%d %H:%M IST"),
        is_feasible=is_feasible,
        margin_hours=margin_hours,
        status=status,
        notes=notes,
    )


def evaluate_constraints(
    option: JourneyOption,
    cost: CostBreakdown,
    deadline: DeadlineEvaluation,
    budget_inr: float,
    deadline_hours: float,
    weight_kg: float,
    preferred_modes: Optional[List[TransportMode]] = None,
) -> ConstraintCheckResult:
    """Validate candidate journey against hard constraints and soft preferences."""
    rejection_reasons = []

    # Hard constraint: Budget
    is_budget_met = cost.total_cost_inr <= budget_inr
    if not is_budget_met:
        over_budget = cost.total_cost_inr - budget_inr
        rejection_reasons.append(
            f"Exceeds budget: estimated ₹{cost.total_cost_inr:,.2f} is ₹{over_budget:,.2f} over the ₹{budget_inr:,.2f} limit."
        )

    # Hard constraint: Deadline
    is_deadline_met = deadline.is_feasible
    if not is_deadline_met:
        rejection_reasons.append(
            f"Exceeds deadline: estimated duration {deadline.estimated_duration_hours:.1f}h is longer than allowable {deadline_hours:.1f}h."
        )

    # Hard constraint: Vehicle weight capacity
    is_weight_met = weight_kg <= option.weight_capacity_kg
    if not is_weight_met:
        rejection_reasons.append(
            f"Overweight: payload {weight_kg:.1f}kg exceeds carrier vehicle maximum of {option.weight_capacity_kg:.1f}kg."
        )

    # Preference: Mode
    is_mode_met = True
    if preferred_modes and option.mode not in preferred_modes:
        is_mode_met = False
        rejection_reasons.append(
            f"Mode mismatch: carrier mode {option.mode.value} not in user preferred modes {[m.value for m in preferred_modes]}."
        )

    overall_feasible = is_budget_met and is_deadline_met and is_weight_met

    return ConstraintCheckResult(
        is_budget_met=is_budget_met,
        is_deadline_met=is_deadline_met,
        is_weight_met=is_weight_met,
        is_mode_met=is_mode_met,
        overall_feasible=overall_feasible,
        rejection_reasons=rejection_reasons,
    )


def score_option(
    option: JourneyOption,
    cost: CostBreakdown,
    deadline: DeadlineEvaluation,
    constraints: ConstraintCheckResult,
    priority: PriorityGoal,
    max_cost_ref: float,
    max_duration_ref: float,
) -> float:
    """Deterministic multi-criteria scoring function (higher is better)."""
    if not constraints.overall_feasible:
        # Heavily penalized for violating hard constraints
        return -100.0 - len(constraints.rejection_reasons) * 20.0

    # Normalized metrics (0 to 1 where 1 is best)
    cost_norm = max(0.0, 1.0 - (cost.total_cost_inr / max(max_cost_ref, 1.0)))
    time_norm = max(0.0, 1.0 - (deadline.estimated_duration_hours / max(max_duration_ref, 1.0)))
    reliability_norm = option.reliability_score

    if priority == PriorityGoal.CHEAPEST:
        score = (cost_norm * 0.65) + (time_norm * 0.20) + (reliability_norm * 0.15)
    elif priority == PriorityGoal.FASTEST:
        score = (time_norm * 0.65) + (cost_norm * 0.20) + (reliability_norm * 0.15)
    elif priority == PriorityGoal.DEADLINE_CRITICAL:
        # Heavy emphasis on reliability and comfortable time margin
        score = (reliability_norm * 0.50) + (time_norm * 0.35) + (cost_norm * 0.15)
    else:  # BALANCED
        score = (cost_norm * 0.35) + (time_norm * 0.35) + (reliability_norm * 0.30)

    # Bonus if preferred mode
    if constraints.is_mode_met:
        score += 0.05

    return round(score, 4)


def compare_routes(
    origin: str,
    destination: str,
    budget_inr: float,
    deadline_hours: float,
    weight_kg: float = 5.0,
    shipment_type: ShipmentType = ShipmentType.STANDARD,
    priority: PriorityGoal = PriorityGoal.BALANCED,
    preferred_modes: Optional[List[TransportMode]] = None,
) -> ComparisonResult:
    """Compare all available candidate routes and rank them with deterministic logic."""
    if budget_inr <= 0:
        raise ValueError("Budget must be greater than zero")
    if deadline_hours <= 0:
        raise ValueError("Deadline hours must be greater than zero")
    if weight_kg <= 0:
        raise ValueError("Weight must be greater than zero")

    candidates = get_options_for_route(origin, destination)
    if not candidates:
        # Fallback corridor matching for demonstration
        candidates = [opt for opt in SAMPLE_JOURNEY_OPTIONS if opt.origin.lower() == origin.lower()]
        if not candidates:
            candidates = SAMPLE_JOURNEY_OPTIONS[:4]

    evaluated_list: List[EvaluatedOption] = []
    max_cost_ref = max([opt.base_cost_inr * 2.5 for opt in candidates] + [budget_inr])
    max_duration_ref = max([opt.base_duration_hours * 1.5 for opt in candidates] + [deadline_hours])

    for opt in candidates:
        cost = calculate_delivery_cost(opt, weight_kg, shipment_type)
        deadline = check_delivery_deadline(opt.departure_time, opt.base_duration_hours, deadline_hours)
        constraints = evaluate_constraints(opt, cost, deadline, budget_inr, deadline_hours, weight_kg, preferred_modes)
        score = score_option(opt, cost, deadline, constraints, priority, max_cost_ref, max_duration_ref)

        tradeoff = (
            f"{opt.mode.value} via {opt.carrier}: ₹{cost.total_cost_inr:,.0f}, {deadline.estimated_duration_hours:.1f}h. "
            f"Reliability: {int(opt.reliability_score * 100)}%. "
        )
        if constraints.overall_feasible:
            tradeoff += f"Feasible with {deadline.margin_hours:+.1f}h margin."
        else:
            tradeoff += f"Rejected: {', '.join(constraints.rejection_reasons)}"

        evaluated_list.append(
            EvaluatedOption(
                option=opt,
                cost=cost,
                deadline=deadline,
                constraints=constraints,
                score=score,
                is_recommended=False,
                tradeoff_summary=tradeoff,
            )
        )

    # Sort: feasible options first by score descending; infeasible by closest margin/cost
    feasible = [item for item in evaluated_list if item.constraints.overall_feasible]
    infeasible = [item for item in evaluated_list if not item.constraints.overall_feasible]

    feasible.sort(key=lambda x: x.score, reverse=True)
    infeasible.sort(key=lambda x: x.deadline.margin_hours, reverse=True)

    has_feasible = len(feasible) > 0
    recommended: Optional[EvaluatedOption] = None

    if has_feasible:
        recommended = feasible[0]
        recommended.is_recommended = True
        refusal_msg = (
            f"Selected '{recommended.option.name}' as the optimal plan ({priority.value} priority). "
            f"Satisfies hard budget (₹{recommended.cost.total_cost_inr:,.0f} ≤ ₹{budget_inr:,.0f}) and "
            f"deadline ({recommended.deadline.estimated_duration_hours:.1f}h ≤ {deadline_hours:.1f}h) "
            f"with {int(recommended.option.reliability_score * 100)}% historical reliability."
        )
        final_list = feasible + infeasible
    else:
        # Honest refusal when no option meets all constraints
        closest_cost = min(evaluated_list, key=lambda x: x.cost.total_cost_inr)
        closest_time = min(evaluated_list, key=lambda x: x.deadline.estimated_duration_hours)
        refusal_msg = (
            f"HONEST REFUSAL: No sample option satisfies all hard constraints for this journey. "
            f"The closest on budget is '{closest_cost.option.name}' at ₹{closest_cost.cost.total_cost_inr:,.0f} "
            f"(needs {closest_cost.deadline.estimated_duration_hours:.1f}h, misses deadline by {abs(closest_cost.deadline.margin_hours):.1f}h). "
            f"The closest on deadline is '{closest_time.option.name}' taking {closest_time.deadline.estimated_duration_hours:.1f}h "
            f"(costs ₹{closest_time.cost.total_cost_inr:,.0f}, exceeds budget by ₹{closest_time.cost.total_cost_inr - budget_inr:,.0f})."
        )
        final_list = infeasible

    return ComparisonResult(
        origin=origin,
        destination=destination,
        priority=priority,
        budget_inr=budget_inr,
        deadline_hours=deadline_hours,
        total_evaluated=len(evaluated_list),
        feasible_count=len(feasible),
        recommended_option=recommended,
        alternatives=final_list,
        has_feasible_solution=has_feasible,
        refusal_or_tradeoff_explanation=refusal_msg,
    )


def simulate_delay(
    option_id: str,
    delay_hours: float,
    is_cancelled: bool = False,
    cost_increase_pct: float = 0.0,
    reason: str = "Simulated track/highway bottleneck",
) -> DisruptionDetails:
    """Generate disruption event details for testing resilience."""
    if delay_hours < 0:
        raise ValueError("Delay hours cannot be negative")

    return DisruptionDetails(
        option_id=option_id,
        delay_hours=delay_hours,
        is_cancelled=is_cancelled,
        cost_increase_pct=cost_increase_pct,
        reason=reason,
    )


def replan_journey(
    original_option_id: str,
    origin: str,
    destination: str,
    delay_hours: float,
    budget_inr: float,
    deadline_hours: float,
    weight_kg: float = 5.0,
    shipment_type: ShipmentType = ShipmentType.STANDARD,
    priority: PriorityGoal = PriorityGoal.BALANCED,
    is_cancelled: bool = False,
    cost_increase_pct: float = 0.0,
    disruption_reason: str = "Simulated transit disruption",
) -> ReplanningResult:
    """Re-evaluate the journey after a disruption on the selected plan."""
    # Find original option
    all_options = get_options_for_route(origin, destination)
    if not all_options:
        all_options = SAMPLE_JOURNEY_OPTIONS
    
    orig_opt = next((o for o in all_options if o.id == original_option_id), all_options[0])

    orig_cost = calculate_delivery_cost(orig_opt, weight_kg, shipment_type)
    orig_deadline = check_delivery_deadline(orig_opt.departure_time, orig_opt.base_duration_hours, deadline_hours)

    # Disrupted state of the original option
    disruption = simulate_delay(orig_opt.id, delay_hours, is_cancelled, cost_increase_pct, disruption_reason)
    disrupted_duration = orig_opt.base_duration_hours + delay_hours
    disrupted_deadline = check_delivery_deadline(orig_opt.departure_time, disrupted_duration, deadline_hours)
    
    disrupted_still_feasible = disrupted_deadline.is_feasible and not is_cancelled

    # Evaluate alternatives considering disrupted state
    all_candidates: List[EvaluatedOption] = []
    for opt in all_options:
        if opt.id == orig_opt.id:
            # If original is cancelled, it cannot be chosen
            if is_cancelled:
                continue
            # Evaluated with the delay added
            cost_adj = orig_cost.total_cost_inr * (1.0 + (cost_increase_pct / 100.0))
            c = calculate_delivery_cost(opt, weight_kg, shipment_type, disruption_cost_inr=cost_adj - orig_cost.total_cost_inr)
            d = disrupted_deadline
        else:
            c = calculate_delivery_cost(opt, weight_kg, shipment_type)
            d = check_delivery_deadline(opt.departure_time, opt.base_duration_hours, deadline_hours)

        con = evaluate_constraints(opt, c, d, budget_inr, deadline_hours, weight_kg)
        sc = score_option(opt, c, d, con, priority, budget_inr * 1.5, deadline_hours * 1.5)

        all_candidates.append(
            EvaluatedOption(
                option=opt,
                cost=c,
                deadline=d,
                constraints=con,
                score=sc,
                is_recommended=False,
                tradeoff_summary=f"{opt.name} ({opt.mode.value}): ₹{c.total_cost_inr:,.0f}, {d.estimated_duration_hours:.1f}h",
            )
        )

    feasible_cands = [c for c in all_candidates if c.constraints.overall_feasible]
    feasible_cands.sort(key=lambda x: x.score, reverse=True)

    revised_rec: Optional[EvaluatedOption] = None
    if feasible_cands:
        revised_rec = feasible_cands[0]
        revised_rec.is_recommended = True

    if revised_rec:
        cost_delta = round(revised_rec.cost.total_cost_inr - orig_cost.total_cost_inr, 2)
        dur_delta = round(revised_rec.deadline.estimated_duration_hours - orig_opt.base_duration_hours, 2)

        if revised_rec.option.id == orig_opt.id:
            explanation = (
                f"Original option '{orig_opt.name}' absorbed the {delay_hours:.1f}h delay while remaining "
                f"within deadline ({disrupted_duration:.1f}h ≤ {deadline_hours:.1f}h). Recommended staying on course."
            )
        else:
            explanation = (
                f"REPLAN TRIGGERED: {delay_hours:.1f}h delay rendered '{orig_opt.name}' {disrupted_deadline.status.value}. "
                f"Pivoted to '{revised_rec.option.name}' ({revised_rec.option.mode.value}). "
                f"Arrives in {revised_rec.deadline.estimated_duration_hours:.1f}h (saving {abs(dur_delta):.1f}h vs delayed plan), "
                f"with cost variance of ₹{cost_delta:+,.2f}."
            )
    else:
        cost_delta = 0.0
        dur_delta = delay_hours
        explanation = (
            f"CRITICAL DISRUPTION: No alternative candidate can fulfill both ₹{budget_inr:,.0f} budget "
            f"and {deadline_hours:.1f}h deadline after the {delay_hours:.1f}h disruption. Immediate human dispatcher escalation required."
        )

    remaining_risks = []
    if revised_rec and revised_rec.deadline.margin_hours < 0.5:
        remaining_risks.append(f"Tight arrival buffer: margin is only {revised_rec.deadline.margin_hours * 60:.0f} minutes")
    if revised_rec and revised_rec.option.mode == TransportMode.ROAD:
        remaining_risks.append("Highway transit remains vulnerable to ongoing coastal corridor congestion")

    return ReplanningResult(
        original_option_id=orig_opt.id,
        original_cost_inr=orig_cost.total_cost_inr,
        original_duration_hours=orig_opt.base_duration_hours,
        original_arrival=orig_deadline.estimated_arrival_time,
        disruption_applied=disruption,
        disrupted_duration_hours=disrupted_duration,
        disrupted_arrival=disrupted_deadline.estimated_arrival_time,
        disrupted_still_feasible=disrupted_still_feasible,
        revised_recommended_option=revised_rec,
        cost_delta_inr=cost_delta,
        duration_delta_hours=dur_delta,
        all_revised_options=all_candidates,
        decision_explanation=explanation,
        remaining_risks=remaining_risks,
    )
