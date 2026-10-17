"""
RouteWise AI - MCP Server
Exposes 7 deterministic logistics decision tools via official Python MCP SDK over Streamable HTTP.
Independently runnable service.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure backend modules can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from mcp.server.mcpserver import MCPServer
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.logistics.engine import (
    calculate_delivery_cost as engine_calculate_cost,
    check_delivery_deadline as engine_check_deadline,
    compare_routes as engine_compare_routes,
    evaluate_constraints as engine_evaluate_constraints,
    replan_journey as engine_replan_journey,
    simulate_delay as engine_simulate_delay,
)
from app.logistics.models import (
    PriorityGoal,
    ShipmentType,
    TransportMode,
)
from app.logistics.sample_data import SAMPLE_JOURNEY_OPTIONS, get_options_for_route


def create_mcp_server() -> MCPServer:
    """Instantiate and register tools for RouteWise AI MCP Server."""
    srv = MCPServer(
        name="routewise-logistics-server",
        instructions="Deterministic multi-modal travel and logistics decision engine for RouteWise AI.",
    )

    @srv.tool(
        name="compare_routes",
        description="Compare transport and delivery options for a journey corridor against budget, deadline, and priority.",
    )
    def compare_routes(
        origin: str,
        destination: str,
        budget_inr: float,
        deadline_hours: float,
        weight_kg: float = 5.0,
        shipment_type: str = "STANDARD",
        priority: str = "BALANCED",
        preferred_modes: Optional[List[str]] = None,
    ) -> str:
        stype = ShipmentType(shipment_type.upper()) if shipment_type.upper() in ShipmentType.__members__ else ShipmentType.STANDARD
        pgoal = PriorityGoal(priority.upper()) if priority.upper() in PriorityGoal.__members__ else PriorityGoal.BALANCED
        pmodes = None
        if preferred_modes:
            pmodes = [TransportMode(m.upper()) for m in preferred_modes if m.upper() in TransportMode.__members__]

        result = engine_compare_routes(
            origin=origin,
            destination=destination,
            budget_inr=budget_inr,
            deadline_hours=deadline_hours,
            weight_kg=weight_kg,
            shipment_type=stype,
            priority=pgoal,
            preferred_modes=pmodes,
        )
        return result.model_dump_json()

    @srv.tool(
        name="calculate_delivery_cost",
        description="Calculate itemized freight cost breakdown in INR for an option, weight, and shipment type.",
    )
    def calculate_delivery_cost(
        option_id: str,
        weight_kg: float = 5.0,
        shipment_type: str = "STANDARD",
        declared_value_inr: Optional[float] = None,
        disruption_cost_inr: float = 0.0,
    ) -> str:
        opt = next((o for o in SAMPLE_JOURNEY_OPTIONS if o.id == option_id), None)
        if not opt:
            return json.dumps({"error": f"Option ID '{option_id}' not found in registered corridors"})

        stype = ShipmentType(shipment_type.upper()) if shipment_type.upper() in ShipmentType.__members__ else ShipmentType.STANDARD
        result = engine_calculate_cost(
            option=opt,
            weight_kg=weight_kg,
            shipment_type=stype,
            declared_value_inr=declared_value_inr,
            disruption_cost_inr=disruption_cost_inr,
        )
        return result.model_dump_json()

    @srv.tool(
        name="check_delivery_deadline",
        description="Evaluate arrival time and margin against required deadline window.",
    )
    def check_delivery_deadline(
        departure_time: str,
        duration_hours: float,
        deadline_hours: float,
    ) -> str:
        result = engine_check_deadline(
            departure_time_str=departure_time,
            duration_hours=duration_hours,
            deadline_hours=deadline_hours,
        )
        return result.model_dump_json()

    @srv.tool(
        name="simulate_delay",
        description="Simulate transit delays or disruptions on a journey option.",
    )
    def simulate_delay(
        option_id: str,
        delay_hours: float,
        is_cancelled: bool = False,
        cost_increase_pct: float = 0.0,
        reason: str = "Simulated transit disruption",
    ) -> str:
        result = engine_simulate_delay(
            option_id=option_id,
            delay_hours=delay_hours,
            is_cancelled=is_cancelled,
            cost_increase_pct=cost_increase_pct,
            reason=reason,
        )
        return result.model_dump_json()

    @srv.tool(
        name="replan_journey",
        description="Re-evaluate and select the best alternative journey option after a disruption.",
    )
    def replan_journey(
        original_option_id: str,
        origin: str,
        destination: str,
        delay_hours: float,
        budget_inr: float,
        deadline_hours: float,
        weight_kg: float = 5.0,
        shipment_type: str = "STANDARD",
        priority: str = "BALANCED",
        is_cancelled: bool = False,
        cost_increase_pct: float = 0.0,
        disruption_reason: str = "Simulated transit disruption",
    ) -> str:
        stype = ShipmentType(shipment_type.upper()) if shipment_type.upper() in ShipmentType.__members__ else ShipmentType.STANDARD
        pgoal = PriorityGoal(priority.upper()) if priority.upper() in PriorityGoal.__members__ else PriorityGoal.BALANCED

        result = engine_replan_journey(
            original_option_id=original_option_id,
            origin=origin,
            destination=destination,
            delay_hours=delay_hours,
            budget_inr=budget_inr,
            deadline_hours=deadline_hours,
            weight_kg=weight_kg,
            shipment_type=stype,
            priority=pgoal,
            is_cancelled=is_cancelled,
            cost_increase_pct=cost_increase_pct,
            disruption_reason=disruption_reason,
        )
        return result.model_dump_json()

    @srv.tool(
        name="evaluate_constraints",
        description="Check candidate journey against budget, deadline, and payload weight constraints.",
    )
    def evaluate_constraints(
        option_id: str,
        budget_inr: float,
        deadline_hours: float,
        weight_kg: float = 5.0,
        shipment_type: str = "STANDARD",
        preferred_modes: Optional[List[str]] = None,
    ) -> str:
        opt = next((o for o in SAMPLE_JOURNEY_OPTIONS if o.id == option_id), None)
        if not opt:
            return json.dumps({"error": f"Option ID '{option_id}' not found"})

        stype = ShipmentType(shipment_type.upper()) if shipment_type.upper() in ShipmentType.__members__ else ShipmentType.STANDARD
        pmodes = None
        if preferred_modes:
            pmodes = [TransportMode(m.upper()) for m in preferred_modes if m.upper() in TransportMode.__members__]

        cost = engine_calculate_cost(opt, weight_kg, stype)
        deadline = engine_check_deadline(opt.departure_time, opt.base_duration_hours, deadline_hours)
        res = engine_evaluate_constraints(opt, cost, deadline, budget_inr, deadline_hours, weight_kg, pmodes)
        return res.model_dump_json()

    @srv.tool(
        name="explain_tradeoffs",
        description="Explain tradeoffs between cost, duration, reliability, and carbon emissions for available options.",
    )
    def explain_tradeoffs(
        origin: str,
        destination: str,
        budget_inr: float,
        deadline_hours: float,
        priority: str = "BALANCED",
    ) -> str:
        pgoal = PriorityGoal(priority.upper()) if priority.upper() in PriorityGoal.__members__ else PriorityGoal.BALANCED
        res = engine_compare_routes(origin, destination, budget_inr, deadline_hours, priority=pgoal)

        tradeoffs = {
            "corridor": f"{origin} -> {destination}",
            "priority": pgoal.value,
            "feasible_options_count": res.feasible_count,
            "recommendation": res.recommended_option.option.name if res.recommended_option else "None (infeasible)",
            "rationale": res.refusal_or_tradeoff_explanation,
            "options_tradeoff_summary": [
                {
                    "option_id": item.option.id,
                    "name": item.option.name,
                    "mode": item.option.mode.value,
                    "cost_inr": item.cost.total_cost_inr,
                    "duration_hours": item.deadline.estimated_duration_hours,
                    "reliability_pct": int(item.option.reliability_score * 100),
                    "carbon_kg": item.option.carbon_emissions_kg,
                    "is_feasible": item.constraints.overall_feasible,
                    "tradeoff_detail": item.tradeoff_summary,
                }
                for item in res.alternatives
            ],
            "simulation_disclaimer": "Sample deterministic estimates; not real-time carrier quotes.",
        }
        return json.dumps(tradeoffs, indent=2)

    return srv


async def health_check_endpoint(request):
    """Health check endpoint for MCP server status monitoring."""
    return JSONResponse(
        {
            "status": "healthy",
            "server": "routewise-logistics-server",
            "protocol": "Model Context Protocol (MCP) Streamable HTTP",
            "tools_count": 7,
            "tools": [
                "compare_routes",
                "calculate_delivery_cost",
                "check_delivery_deadline",
                "simulate_delay",
                "replan_journey",
                "evaluate_constraints",
                "explain_tradeoffs",
            ],
        }
    )


def create_app():
    """Create a fresh Starlette application with MCP Streamable HTTP and health endpoint."""
    srv = create_mcp_server()
    mcp_path = os.getenv("MCP_SERVER_PATH", "/mcp")
    application = srv.streamable_http_app(streamable_http_path=mcp_path)
    application.routes.insert(0, Route("/health", health_check_endpoint, methods=["GET"]))
    return application


# Global application instance for running with uvicorn
app = create_app()

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
    port = int(os.getenv("MCP_SERVER_PORT", "8000"))
    print(f"Starting RouteWise MCP Server on http://{host}:{port} (MCP endpoint: {os.getenv('MCP_SERVER_PATH', '/mcp')})")
    uvicorn.run(app, host=host, port=port, log_level="info")
