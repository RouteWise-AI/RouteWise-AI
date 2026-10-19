"""
RouteWise AI - Logistics Domain Models
Strongly-typed Pydantic schemas for journeys, constraints, costs, and replanning.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class TransportMode(str, Enum):
    ROAD = "ROAD"
    EXPRESS_ROAD = "EXPRESS_ROAD"
    RAIL = "RAIL"
    AIR = "AIR"


class ShipmentType(str, Enum):
    STANDARD = "STANDARD"
    EXPRESS = "EXPRESS"
    FRAGILE = "FRAGILE"
    PERISHABLE = "PERISHABLE"
    DOCUMENT = "DOCUMENT"


class PriorityGoal(str, Enum):
    CHEAPEST = "CHEAPEST"
    FASTEST = "FASTEST"
    BALANCED = "BALANCED"
    DEADLINE_CRITICAL = "DEADLINE_CRITICAL"


class DeadlineStatus(str, Enum):
    ON_TIME = "ON_TIME"
    AT_RISK = "AT_RISK"
    LATE = "LATE"


class FeasibilityStatus(str, Enum):
    FEASIBLE = "FEASIBLE"
    INFEASIBLE = "INFEASIBLE"
    PARTIAL = "PARTIAL"


class Location(BaseModel):
    id: str
    name: str
    city: str
    state: str
    hub_type: str = "INTERCITY_HUB"
    lat: float = 0.0
    lon: float = 0.0
    rail_code: Optional[str] = None
    airport_code: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    supported_modes: List[TransportMode] = Field(default_factory=list)


class ShipmentDetails(BaseModel):
    weight_kg: float = Field(..., gt=0, description="Package weight in kilograms")
    shipment_type: ShipmentType = Field(default=ShipmentType.STANDARD)
    declared_value_inr: Optional[float] = Field(default=None, ge=0)
    handling_requirements: List[str] = Field(default_factory=list)


class JourneyOption(BaseModel):
    id: str
    name: str
    carrier: str
    mode: TransportMode
    origin: str
    destination: str
    distance_km: float
    base_duration_hours: float
    base_cost_inr: float
    weight_capacity_kg: float
    reliability_score: float = Field(..., ge=0.0, le=1.0)
    carbon_emissions_kg: float
    departure_time: str
    assumptions: List[str] = Field(default_factory=list)


class CostBreakdown(BaseModel):
    base_cost_inr: float
    weight_surcharge_inr: float
    handling_surcharge_inr: float
    disruption_cost_inr: float = 0.0
    total_cost_inr: float
    currency: str = "INR"
    calculation_notes: List[str] = Field(default_factory=list)


class DeadlineEvaluation(BaseModel):
    departure_time: str
    estimated_duration_hours: float
    estimated_arrival_time: str
    required_deadline: str
    is_feasible: bool
    margin_hours: float = Field(description="Positive if early, negative if late")
    status: DeadlineStatus
    notes: str


class ConstraintCheckResult(BaseModel):
    is_budget_met: bool
    is_deadline_met: bool
    is_weight_met: bool
    is_mode_met: bool
    overall_feasible: bool
    rejection_reasons: List[str] = Field(default_factory=list)


class EvaluatedOption(BaseModel):
    option: JourneyOption
    cost: CostBreakdown
    deadline: DeadlineEvaluation
    constraints: ConstraintCheckResult
    score: float
    is_recommended: bool = False
    tradeoff_summary: str = ""


class DisruptionDetails(BaseModel):
    option_id: str
    delay_hours: float = Field(..., ge=0)
    is_cancelled: bool = False
    cost_increase_pct: float = Field(default=0.0, ge=0)
    reason: str = "Simulated traffic / transit delay"


class ComparisonResult(BaseModel):
    run_id: str = Field(default="", description="Unique authoritative planning-run identifier")
    created_at: str = Field(default="", description="ISO timestamp of run execution")
    origin: str
    destination: str
    origin_id: str = ""
    destination_id: str = ""
    distance_km: float = 0.0
    priority: PriorityGoal
    budget_inr: float
    deadline_hours: float
    weight_kg: float = 5.0
    shipment_type: ShipmentType = ShipmentType.STANDARD
    total_evaluated: int
    feasible_count: int
    recommended_option: Optional[EvaluatedOption] = None
    alternatives: List[EvaluatedOption] = Field(default_factory=list)
    has_feasible_solution: bool
    refusal_or_tradeoff_explanation: str
    data_source: str = "RouteWise Deterministic Logistics Engine v1.0 (Simulated estimates - not live carrier telemetry)"


class ReplanningResult(BaseModel):
    run_id: str = Field(default="", description="Unique authoritative planning-run identifier")
    created_at: str = Field(default="", description="ISO timestamp of run execution")
    original_option_id: str
    original_option_name: str = ""
    original_carrier: str = ""
    original_mode: TransportMode = TransportMode.RAIL
    origin: str = ""
    destination: str = ""
    origin_id: str = ""
    destination_id: str = ""
    budget_inr: float = 0.0
    deadline_hours: float = 0.0
    original_cost_inr: float
    original_duration_hours: float
    original_arrival: str
    disruption_applied: DisruptionDetails
    baseline_duration_hours: float = 0.0
    applicable_delay_hours: float = 0.0
    disrupted_duration_hours: float
    disrupted_arrival: str
    disrupted_margin_hours: float = 0.0
    disrupted_status: DeadlineStatus = DeadlineStatus.ON_TIME
    disrupted_still_feasible: bool
    revised_recommended_option: Optional[EvaluatedOption] = None
    is_revised_feasible: bool = False
    cost_delta_inr: float
    duration_delta_hours: float
    all_revised_options: List[EvaluatedOption] = Field(default_factory=list)
    decision_explanation: str
    remaining_risks: List[str] = Field(default_factory=list)
    data_source: str = "RouteWise Deterministic Logistics Engine v1.0 (Simulated disruption estimates)"


