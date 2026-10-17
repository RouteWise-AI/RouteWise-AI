"""
Unit tests for RouteWise AI Deterministic Logistics Engine
Validates cost calculations, deadline evaluations, constraint checks, disruptions, and replanning.
"""

import pytest
from app.logistics.engine import (
    calculate_delivery_cost,
    check_delivery_deadline,
    compare_routes,
    evaluate_constraints,
    replan_journey,
    simulate_delay,
)
from app.logistics.models import (
    DeadlineStatus,
    PriorityGoal,
    ShipmentType,
    TransportMode,
)
from app.logistics.sample_data import SAMPLE_JOURNEY_OPTIONS, get_options_for_route


def test_sample_corridors_exist():
    options = get_options_for_route("Vijayawada", "Visakhapatnam")
    assert len(options) >= 3
    modes = {opt.mode for opt in options}
    assert TransportMode.RAIL in modes
    assert TransportMode.ROAD in modes or TransportMode.EXPRESS_ROAD in modes
    assert TransportMode.AIR in modes


def test_cost_calculation_base():
    rail_opt = next(opt for opt in SAMPLE_JOURNEY_OPTIONS if opt.id == "BZA-VTZ-RAIL-01")
    cost = calculate_delivery_cost(rail_opt, weight_kg=5.0, shipment_type=ShipmentType.STANDARD)
    assert cost.total_cost_inr == 1450.0
    assert cost.weight_surcharge_inr == 0.0
    assert cost.handling_surcharge_inr == 0.0


def test_cost_calculation_with_surcharges():
    air_opt = next(opt for opt in SAMPLE_JOURNEY_OPTIONS if opt.id == "BZA-VTZ-AIR-01")
    # Base 3200 + excess weight (10kg - 5kg = 5kg * 65 = 325) + Fragile fee (180) = 3705
    cost = calculate_delivery_cost(air_opt, weight_kg=10.0, shipment_type=ShipmentType.FRAGILE)
    assert cost.base_cost_inr == 3200.0
    assert cost.weight_surcharge_inr == 325.0
    assert cost.handling_surcharge_inr == 180.0
    assert cost.total_cost_inr == 3705.0


def test_deadline_evaluation_on_time():
    eval_res = check_delivery_deadline("08:00", duration_hours=4.2, deadline_hours=6.0)
    assert eval_res.is_feasible is True
    assert eval_res.margin_hours == 1.8
    assert eval_res.status == DeadlineStatus.ON_TIME


def test_deadline_evaluation_late():
    eval_res = check_delivery_deadline("08:00", duration_hours=7.5, deadline_hours=6.0)
    assert eval_res.is_feasible is False
    assert eval_res.margin_hours == -1.5
    assert eval_res.status == DeadlineStatus.LATE


def test_invalid_inputs_raise_errors():
    rail_opt = next(opt for opt in SAMPLE_JOURNEY_OPTIONS if opt.id == "BZA-VTZ-RAIL-01")
    with pytest.raises(ValueError, match="weight must be greater than 0"):
        calculate_delivery_cost(rail_opt, weight_kg=-2.0)

    with pytest.raises(ValueError, match="Deadline hours must be strictly positive"):
        check_delivery_deadline("08:00", duration_hours=4.0, deadline_hours=-1.0)


def test_compare_routes_primary_scenario():
    """
    Scenario: Vijayawada -> Visakhapatnam, budget ₹2,000, deadline 6.0h, balanced/reliability.
    Expect Rail (4.2h, ₹1,450) or Highway Express (5.5h, ₹1,100) to be feasible.
    Air (₹3,200) should be rejected for budget, Standard Road (7.5h) rejected for deadline.
    """
    res = compare_routes(
        origin="Vijayawada",
        destination="Visakhapatnam",
        budget_inr=2000.0,
        deadline_hours=6.0,
        weight_kg=5.0,
        priority=PriorityGoal.DEADLINE_CRITICAL,
    )
    assert res.has_feasible_solution is True
    assert res.recommended_option is not None
    # Rail has higher reliability (0.94 vs 0.88) and meets both constraints
    assert res.recommended_option.option.id == "BZA-VTZ-RAIL-01"
    assert res.recommended_option.cost.total_cost_inr <= 2000.0
    assert res.recommended_option.deadline.estimated_duration_hours <= 6.0

    # Verify rejected options reasons
    air_opt = next(item for item in res.alternatives if item.option.id == "BZA-VTZ-AIR-01")
    assert air_opt.constraints.overall_feasible is False
    assert any("budget" in r.lower() for r in air_opt.constraints.rejection_reasons)

    std_road = next(item for item in res.alternatives if item.option.id == "BZA-VTZ-ROAD-STD")
    assert std_road.constraints.overall_feasible is False
    assert any("deadline" in r.lower() for r in std_road.constraints.rejection_reasons)


def test_honest_refusal_when_infeasible():
    """
    Scenario: Vijayawada -> Visakhapatnam with tight deadline (3h) and tight budget (₹1,500).
    Air is 2.3h but costs ₹3,200.
    Rail is ₹1,450 but takes 4.2h.
    No option can satisfy BOTH hard constraints. Engine must honestly refuse!
    """
    res = compare_routes(
        origin="Vijayawada",
        destination="Visakhapatnam",
        budget_inr=1500.0,
        deadline_hours=3.0,
        weight_kg=5.0,
    )
    assert res.has_feasible_solution is False
    assert res.recommended_option is None
    assert "HONEST REFUSAL" in res.refusal_or_tradeoff_explanation


def test_disruption_and_replanning_scenario():
    """
    Simulate a 2.0-hour delay on Rail option (4.2h + 2.0h = 6.2h, which exceeds 6.0h deadline).
    Replanner must recognize Rail is now late and recommend switching to Coastal Highway Express (5.5h).
    """
    replan = replan_journey(
        original_option_id="BZA-VTZ-RAIL-01",
        origin="Vijayawada",
        destination="Visakhapatnam",
        delay_hours=2.0,
        budget_inr=2000.0,
        deadline_hours=6.0,
        priority=PriorityGoal.BALANCED,
    )
    assert replan.disrupted_still_feasible is False
    assert replan.revised_recommended_option is not None
    # Switched to Coastal Express Road
    assert replan.revised_recommended_option.option.id == "BZA-VTZ-ROAD-EXP"
    assert replan.revised_recommended_option.deadline.estimated_duration_hours <= 6.0
    assert "REPLAN TRIGGERED" in replan.decision_explanation

