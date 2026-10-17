"""
RouteWise AI - API Request and Response Schemas
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default-session"
    history: List[ChatMessage] = Field(default_factory=list)
    override_provider: Optional[str] = None  # "mock" or "bedrock"


class ChatResponse(BaseModel):
    response: str
    provider_used: str
    model_id: Optional[str] = None
    tools_executed: List[Dict[str, Any]] = Field(default_factory=list)
    extracted_constraints: Optional[Dict[str, Any]] = None
    session_id: str


class CompareRoutesRequest(BaseModel):
    origin: str = "Vijayawada"
    destination: str = "Visakhapatnam"
    budget_inr: float = 2000.0
    deadline_hours: float = 6.0
    weight_kg: float = 5.0
    shipment_type: str = "STANDARD"
    priority: str = "BALANCED"
    preferred_modes: Optional[List[str]] = None


class CalculateCostRequest(BaseModel):
    option_id: str
    weight_kg: float = 5.0
    shipment_type: str = "STANDARD"
    declared_value_inr: Optional[float] = None
    disruption_cost_inr: float = 0.0


class CheckDeadlineRequest(BaseModel):
    departure_time: str = "08:00"
    duration_hours: float
    deadline_hours: float


class SimulateDelayRequest(BaseModel):
    option_id: str
    delay_hours: float
    is_cancelled: bool = False
    cost_increase_pct: float = 0.0
    reason: str = "Simulated delay"


class ReplanJourneyRequest(BaseModel):
    original_option_id: str
    origin: str = "Vijayawada"
    destination: str = "Visakhapatnam"
    delay_hours: float = 2.0
    budget_inr: float = 2000.0
    deadline_hours: float = 6.0
    weight_kg: float = 5.0
    shipment_type: str = "STANDARD"
    priority: str = "BALANCED"
    is_cancelled: bool = False
    cost_increase_pct: float = 0.0
    disruption_reason: str = "Simulated track/highway congestion"

