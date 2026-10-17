"""
RouteWise AI - FastAPI API Endpoints
Provides REST endpoints for frontend, wrapping genuine MCP tool calls and agent conversations.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from ..agent.orchestrator import agent_orchestrator
from ..config.settings import settings
from ..mcp_client.activity_logger import mcp_activity_logger
from ..mcp_client.client import default_mcp_client
from ..schemas.api import (
    CalculateCostRequest,
    ChatRequest,
    ChatResponse,
    CheckDeadlineRequest,
    CompareRoutesRequest,
    ReplanJourneyRequest,
    SimulateDelayRequest,
)

router = APIRouter(prefix="/api")


@router.get("/health")
async def get_health() -> Dict[str, Any]:
    """System health check showing backend, MCP server, and AI provider status."""
    mcp_health = await default_mcp_client.check_health()
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "tagline": settings.tagline,
        "ai_provider_mode": settings.ai_provider,
        "aws_region": settings.aws_region if settings.ai_provider == "bedrock" else "N/A (mock mode active)",
        "bedrock_model_id": settings.bedrock_model_id if settings.ai_provider == "bedrock" else "N/A",
        "mcp_server": {
            "configured_url": settings.mcp_server_url,
            "status": mcp_health.get("status", "unknown"),
            "details": mcp_health,
        },
    }


@router.get("/config")
async def get_config() -> Dict[str, Any]:
    """Expose non-sensitive runtime configuration and sample corridors."""
    return {
        "app_name": settings.app_name,
        "version": settings.app_version,
        "ai_provider": settings.ai_provider,
        "aws_region": settings.aws_region,
        "bedrock_model_id": settings.bedrock_model_id,
        "mcp_server_url": settings.mcp_server_url,
        "corridors": [
            {"origin": "Vijayawada", "destination": "Visakhapatnam", "distance_km": 350.0},
            {"origin": "Hyderabad", "destination": "Bengaluru", "distance_km": 570.0},
            {"origin": "Chennai", "destination": "Vijayawada", "distance_km": 430.0},
        ],
        "default_scenario": {
            "origin": "Vijayawada",
            "destination": "Visakhapatnam",
            "budget_inr": 2000.0,
            "deadline_hours": 6.0,
            "priority": "DEADLINE_CRITICAL",
            "weight_kg": 5.0,
        },
    }


@router.post("/agent/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest) -> ChatResponse:
    """Conversational endpoint interacting with the AI logistics decision agent."""
    return await agent_orchestrator.handle_chat(request)


@router.post("/journey/compare")
async def compare_routes_endpoint(req: CompareRoutesRequest) -> Dict[str, Any]:
    """Compare candidate options via real MCP protocol call."""
    try:
        args = {
            "origin": req.origin,
            "destination": req.destination,
            "budget_inr": req.budget_inr,
            "deadline_hours": req.deadline_hours,
            "weight_kg": req.weight_kg,
            "shipment_type": req.shipment_type,
            "priority": req.priority,
            "preferred_modes": req.preferred_modes,
        }
        return await default_mcp_client.call_tool("compare_routes", args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP compare_routes error: {e}")


@router.post("/journey/calculate-cost")
async def calculate_cost_endpoint(req: CalculateCostRequest) -> Dict[str, Any]:
    """Calculate detailed freight cost via real MCP protocol call."""
    try:
        args = {
            "option_id": req.option_id,
            "weight_kg": req.weight_kg,
            "shipment_type": req.shipment_type,
            "declared_value_inr": req.declared_value_inr,
            "disruption_cost_inr": req.disruption_cost_inr,
        }
        return await default_mcp_client.call_tool("calculate_delivery_cost", args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP calculate_delivery_cost error: {e}")


@router.post("/journey/check-deadline")
async def check_deadline_endpoint(req: CheckDeadlineRequest) -> Dict[str, Any]:
    """Check arrival time against deadline via real MCP protocol call."""
    try:
        args = {
            "departure_time": req.departure_time,
            "duration_hours": req.duration_hours,
            "deadline_hours": req.deadline_hours,
        }
        return await default_mcp_client.call_tool("check_delivery_deadline", args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP check_delivery_deadline error: {e}")


@router.post("/journey/simulate-delay")
async def simulate_delay_endpoint(req: SimulateDelayRequest) -> Dict[str, Any]:
    """Simulate transit disruption via real MCP protocol call."""
    try:
        args = {
            "option_id": req.option_id,
            "delay_hours": req.delay_hours,
            "is_cancelled": req.is_cancelled,
            "cost_increase_pct": req.cost_increase_pct,
            "reason": req.reason,
        }
        return await default_mcp_client.call_tool("simulate_delay", args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP simulate_delay error: {e}")


@router.post("/journey/replan")
async def replan_journey_endpoint(req: ReplanJourneyRequest) -> Dict[str, Any]:
    """Replan journey following disruption via real MCP protocol call."""
    try:
        args = {
            "original_option_id": req.original_option_id,
            "origin": req.origin,
            "destination": req.destination,
            "delay_hours": req.delay_hours,
            "budget_inr": req.budget_inr,
            "deadline_hours": req.deadline_hours,
            "weight_kg": req.weight_kg,
            "shipment_type": req.shipment_type,
            "priority": req.priority,
            "is_cancelled": req.is_cancelled,
            "cost_increase_pct": req.cost_increase_pct,
            "disruption_reason": req.disruption_reason,
        }
        return await default_mcp_client.call_tool("replan_journey", args)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MCP replan_journey error: {e}")


@router.get("/mcp/tools")
async def list_mcp_tools() -> Dict[str, Any]:
    """Dynamically discover advertised tools from the MCP server."""
    try:
        tools = await default_mcp_client.discover_tools()
        return {
            "count": len(tools),
            "tools": tools,
            "protocol": "Model Context Protocol over Streamable HTTP",
            "server_url": settings.mcp_server_url,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to query MCP tools: {e}")


@router.get("/mcp/activity")
async def get_mcp_activity(limit: int = 50) -> List[Dict[str, Any]]:
    """Return transparent live activity log of real MCP tool executions for the UI inspector."""
    records = mcp_activity_logger.get_recent(limit=limit)
    return [r.model_dump() for r in records]


@router.post("/mcp/clear-activity")
async def clear_mcp_activity() -> Dict[str, str]:
    """Reset the MCP activity inspector log."""
    mcp_activity_logger.clear()
    return {"status": "cleared"}


@router.post("/demo/reset")
async def reset_demo_state() -> Dict[str, Any]:
    """Reset demo scenario and activity state."""
    mcp_activity_logger.clear()
    agent_orchestrator.clear_session("default-session")
    return {
        "status": "reset_complete",
        "message": "Demo state and session history reset to baseline.",
    }

