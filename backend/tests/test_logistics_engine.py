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


def test_arithmetic_invariant_replan():
    """
    Verify arithmetic invariant: disrupted_duration = baseline_duration + applicable_delay.
    Also verify disrupted_margin_hours = deadline_hours - disrupted_duration.
    """
    delay = 1.75
    deadline = 5.0
    replan = replan_journey(
        original_option_id="BZA-VTZ-RAIL-01",
        origin="Vijayawada",
        destination="Visakhapatnam",
        delay_hours=delay,
        budget_inr=2000.0,
        deadline_hours=deadline,
        priority=PriorityGoal.BALANCED,
    )
    assert replan.baseline_duration_hours == 4.2
    assert replan.applicable_delay_hours == delay
    assert replan.disrupted_duration_hours == round(4.2 + delay, 2)
    expected_margin = round(deadline - (4.2 + delay), 2)
    assert replan.disrupted_margin_hours == expected_margin
    assert replan.disrupted_margin_hours < 0  # 5.0 - 5.95 = -0.95 (late)
    assert replan.disrupted_status == DeadlineStatus.LATE


def test_run_id_and_provenance_tracking():
    """
    Verify authoritative run_id and audit timestamps are generated on every run.
    """
    res1 = compare_routes(
        origin="Vijayawada",
        destination="Visakhapatnam",
        budget_inr=2000.0,
        deadline_hours=6.0,
    )
    res2 = compare_routes(
        origin="Vijayawada",
        destination="Visakhapatnam",
        budget_inr=2000.0,
        deadline_hours=6.0,
    )
    assert res1.run_id is not None and len(res1.run_id) > 8
    assert res2.run_id is not None and len(res2.run_id) > 8
    assert res1.run_id != res2.run_id  # Unique run IDs
    assert res1.created_at is not None and "T" in res1.created_at

    replan = replan_journey(
        original_option_id="BZA-VTZ-RAIL-01",
        origin="Vijayawada",
        destination="Visakhapatnam",
        delay_hours=2.0,
        budget_inr=2000.0,
        deadline_hours=6.0,
    )
    assert replan.run_id is not None and len(replan.run_id) > 8
    assert replan.created_at is not None


def test_replan_no_feasible_alternative():
    """
    Scenario where delay invalidates Rail, and budget/deadline reject all alternatives.
    Replanner must set is_revised_feasible = False and revised_recommended_option = None.
    """
    replan = replan_journey(
        original_option_id="BZA-VTZ-RAIL-01",
        origin="Vijayawada",
        destination="Visakhapatnam",
        delay_hours=3.0,
        budget_inr=1200.0,   # Highway express is ₹1,100 but 5.5h. Deadline is 5.0h.
        deadline_hours=5.0,  # Air is 2.3h but ₹3,200 (budget exceeded).
        priority=PriorityGoal.BALANCED,
    )
    assert replan.disrupted_still_feasible is False
    assert replan.is_revised_feasible is False
    assert replan.revised_recommended_option is None
    assert "CRITICAL DISRUPTION" in replan.decision_explanation


def test_different_corridors_produce_distinct_distances_and_metrics():
    """Verify that different origin-destination pairs produce completely distinct distances, costs, and options."""
    res_vtz = compare_routes("Vijayawada", "Visakhapatnam", budget_inr=5000.0, deadline_hours=24.0)
    res_pnq = compare_routes("Vijayawada", "Pune", budget_inr=5000.0, deadline_hours=24.0)
    res_ixc = compare_routes("Vijayawada", "Chandigarh", budget_inr=8000.0, deadline_hours=48.0)

    # Distances must be distinct and geographically realistic
    assert res_vtz.distance_km < res_pnq.distance_km < res_ixc.distance_km
    assert res_vtz.origin == "Vijayawada" and res_vtz.destination == "Visakhapatnam"
    assert res_pnq.origin == "Vijayawada" and res_pnq.destination == "Pune"
    assert res_ixc.origin == "Vijayawada" and res_ixc.destination == "Chandigarh"

    # Options must have corridor-specific IDs and names
    vtz_ids = {alt.option.id for alt in res_vtz.alternatives}
    pnq_ids = {alt.option.id for alt in res_pnq.alternatives}
    ixc_ids = {alt.option.id for alt in res_ixc.alternatives}

    assert not (vtz_ids & pnq_ids), f"Overlapping IDs found between VTZ and PNQ: {vtz_ids & pnq_ids}"
    assert not (pnq_ids & ixc_ids), f"Overlapping IDs found between PNQ and IXC: {pnq_ids & ixc_ids}"


def test_identical_origin_destination_rejected():
    """Verify that specifying the same city for origin and destination raises ValueError."""
    with pytest.raises(ValueError, match="Origin and destination cannot be identical"):
        compare_routes("Vijayawada", "Vijayawada", budget_inr=2000.0, deadline_hours=6.0)

    with pytest.raises(ValueError, match="Origin and destination cannot be identical"):
        replan_journey("BZA-VTZ-RAIL-01", "Vijayawada", "Vijayawada", delay_hours=1.0, budget_inr=2000.0, deadline_hours=6.0)


def test_unknown_location_rejected():
    """Verify that unknown origin or destination raises an informative ValueError."""
    with pytest.raises(ValueError, match="Unknown or unsupported origin location"):
        compare_routes("Atlantis", "Visakhapatnam", budget_inr=2000.0, deadline_hours=6.0)

    with pytest.raises(ValueError, match="Unknown or unsupported destination location"):
        compare_routes("Vijayawada", "Gotham", budget_inr=2000.0, deadline_hours=6.0)


def test_get_option_by_id_curated_and_dynamic():
    """Verify get_option_by_id resolves both curated and dynamic corridor options."""
    from app.logistics.sample_data import get_option_by_id

    # Curated option
    curated = get_option_by_id("BZA-VTZ-RAIL-01")
    assert curated is not None
    assert curated.origin == "Vijayawada"
    assert curated.destination == "Visakhapatnam"

    # Dynamic option (Vijayawada -> Pune)
    dynamic = get_option_by_id("BZA-PNQ-RAIL-01")
    assert dynamic is not None
    assert dynamic.origin == "Vijayawada"
    assert dynamic.destination == "Pune"
    assert dynamic.distance_km > 800.0

    # Nonexistent option
    none_opt = get_option_by_id("NONEXISTENT-999")
    assert none_opt is None


def test_all_seven_priority_corridors_distinct_and_validated():
    """
    Priority 1 & 9 Validation:
    Verify the 7 explicitly listed corridors:
    - Vijayawada -> Visakhapatnam
    - Vijayawada -> Pune
    - Vijayawada -> Chandigarh
    - Mumbai -> Pune
    - Mumbai -> Chandigarh
    - Delhi -> Chandigarh
    - Hyderabad -> Bengaluru
    """
    corridors = [
        ("Vijayawada", "Visakhapatnam", 300.0, 400.0),
        ("Vijayawada", "Pune", 800.0, 1100.0),
        ("Vijayawada", "Chandigarh", 1500.0, 2000.0),
        ("Mumbai", "Pune", 130.0, 180.0),
        ("Mumbai", "Chandigarh", 1300.0, 1800.0),
        ("Delhi", "Chandigarh", 220.0, 280.0),
        ("Hyderabad", "Bengaluru", 480.0, 650.0),
    ]

    results = []
    for orig, dest, min_dist, max_dist in corridors:
        res = compare_routes(
            origin=orig,
            destination=dest,
            budget_inr=10000.0,
            deadline_hours=48.0,
            weight_kg=5.0,
            priority=PriorityGoal.BALANCED,
        )
        assert res.origin == orig, f"Expected origin {orig}, got {res.origin}"
        assert res.destination == dest, f"Expected dest {dest}, got {res.destination}"
        assert res.origin_id != "", f"Missing origin_id for {orig}"
        assert res.destination_id != "", f"Missing destination_id for {dest}"
        assert min_dist <= res.distance_km <= max_dist, (
            f"Distance for {orig}->{dest} ({res.distance_km} km) outside expected bounds [{min_dist}, {max_dist}]"
        )
        assert len(res.alternatives) >= 3, f"Expected at least 3 candidate modes for {orig}->{dest}"
        assert res.has_feasible_solution is True, f"Expected feasible solution for {orig}->{dest} with generous constraints"
        assert res.recommended_option is not None

        # Verify candidate options are corridor-specific
        for alt in res.alternatives:
            assert alt.option.origin == orig
            assert alt.option.destination == dest
            assert alt.cost.total_cost_inr > 0
            assert alt.deadline.estimated_duration_hours > 0

        results.append(res)

    # Distances between all 7 corridors must not all be identical
    distances = [r.distance_km for r in results]
    assert len(set(distances)) == len(corridors), f"Expected all 7 corridors to have distinct distances, got {distances}"


def test_replan_metadata_propagation():
    """Verify replan_journey propagates canonical origin, destination, and option metadata."""
    replan = replan_journey(
        original_option_id="BZA-VTZ-RAIL-01",
        origin="Vijayawada",
        destination="Visakhapatnam",
        delay_hours=2.0,
        budget_inr=3000.0,
        deadline_hours=8.0,
    )
    assert replan.origin == "Vijayawada"
    assert replan.destination == "Visakhapatnam"
    assert replan.origin_id == "BZA"
    assert replan.destination_id == "VTZ"
    assert replan.original_option_name != ""
    assert replan.original_carrier != ""
    assert replan.budget_inr == 3000.0
    assert replan.deadline_hours == 8.0


def test_five_mandatory_city_pairs_exact():
    """
    Dedicated verification for the 5 required city pairs:
    1. Vijayawada -> Visakhapatnam (~350 km)
    2. Vijayawada -> Pune (~890 km)
    3. Vijayawada -> Chandigarh (~1923 km)
    4. Mumbai -> Pune (~150 km)
    5. Delhi -> Chandigarh (~250 km)
    """
    # 1. Vijayawada -> Visakhapatnam (Coastal Corridor)
    res_bza_vtz = compare_routes("Vijayawada", "Visakhapatnam", budget_inr=2000.0, deadline_hours=6.0)
    assert res_bza_vtz.origin == "Vijayawada"
    assert res_bza_vtz.destination == "Visakhapatnam"
    assert res_bza_vtz.origin_id == "BZA"
    assert res_bza_vtz.destination_id == "VTZ"
    assert 300.0 <= res_bza_vtz.distance_km <= 400.0
    assert res_bza_vtz.has_feasible_solution is True
    assert res_bza_vtz.recommended_option is not None

    # 2. Vijayawada -> Pune (Interstate Corridor)
    res_bza_pnq = compare_routes("Vijayawada", "Pune", budget_inr=5000.0, deadline_hours=20.0)
    assert res_bza_pnq.origin == "Vijayawada"
    assert res_bza_pnq.destination == "Pune"
    assert res_bza_pnq.origin_id == "BZA"
    assert res_bza_pnq.destination_id == "PNQ"
    assert 800.0 <= res_bza_pnq.distance_km <= 1100.0
    assert res_bza_pnq.has_feasible_solution is True

    # 3. Vijayawada -> Chandigarh (Long-haul Corridor - Honest Refusal under tight budget)
    res_bza_ixc_tight = compare_routes("Vijayawada", "Chandigarh", budget_inr=3000.0, deadline_hours=12.0)
    assert res_bza_ixc_tight.origin == "Vijayawada"
    assert res_bza_ixc_tight.destination == "Chandigarh"
    assert res_bza_ixc_tight.origin_id == "BZA"
    assert res_bza_ixc_tight.destination_id == "IXC"
    assert 1800.0 <= res_bza_ixc_tight.distance_km <= 2200.0
    # Over 1900 km cannot be delivered for under ₹3000 in 12 hours -> Honest Refusal!
    assert res_bza_ixc_tight.has_feasible_solution is False
    assert res_bza_ixc_tight.recommended_option is None
    assert "HONEST REFUSAL" in res_bza_ixc_tight.refusal_or_tradeoff_explanation

    # 4. Mumbai -> Pune (Short Expressway Corridor)
    res_bom_pnq = compare_routes("Mumbai", "Pune", budget_inr=1000.0, deadline_hours=3.0)
    assert res_bom_pnq.origin == "Mumbai"
    assert res_bom_pnq.destination == "Pune"
    assert res_bom_pnq.origin_id == "BOM"
    assert res_bom_pnq.destination_id == "PNQ"
    assert 120.0 <= res_bom_pnq.distance_km <= 170.0
    assert res_bom_pnq.has_feasible_solution is True

    # 5. Delhi -> Chandigarh (Northern Trunk)
    res_del_ixc = compare_routes("Delhi", "Chandigarh", budget_inr=1500.0, deadline_hours=5.0)
    assert res_del_ixc.origin == "Delhi"
    assert res_del_ixc.destination == "Chandigarh"
    assert res_del_ixc.origin_id == "DEL"
    assert res_del_ixc.destination_id == "IXC"
    assert 220.0 <= res_del_ixc.distance_km <= 280.0
    assert res_del_ixc.has_feasible_solution is True

    # Assert all 5 distances are distinct
    distances = [
        res_bza_vtz.distance_km,
        res_bza_pnq.distance_km,
        res_bza_ixc_tight.distance_km,
        res_bom_pnq.distance_km,
        res_del_ixc.distance_km,
    ]
    assert len(set(distances)) == 5, f"Distances must all be distinct: {distances}"





