"""
Integration tests for RouteWise AI MCP Server using official MCP SDK
Tests Streamable HTTP session lifecycle, dynamic tool discovery, and tool execution.
"""

import asyncio
import json
import pytest
import uvicorn
from starlette.testclient import TestClient

from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp_server.server import create_app


def test_mcp_health_endpoint():
    app = create_app()
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["tools_count"] == 7
    assert "compare_routes" in data["tools"]


@pytest.mark.anyio
async def test_mcp_streamable_http_protocol_integration():
    """Start MCP server on test port and verify real MCP client session."""
    test_port = 8765
    test_app = create_app()
    config = uvicorn.Config(test_app, host="127.0.0.1", port=test_port, log_level="error")
    uv_server = uvicorn.Server(config)
    
    server_task = asyncio.create_task(uv_server.serve())
    await asyncio.sleep(0.5)

    try:
        url = f"http://127.0.0.1:{test_port}/mcp"
        async with streamable_http_client(url) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                init_res = await session.initialize()
                assert init_res.server_info.name == "routewise-logistics-server"

                # Discover tools dynamically
                tools_res = await session.list_tools()
                tool_names = [t.name for t in tools_res.tools]
                assert len(tool_names) == 7
                assert "compare_routes" in tool_names
                assert "calculate_delivery_cost" in tool_names
                assert "check_delivery_deadline" in tool_names
                assert "simulate_delay" in tool_names
                assert "replan_journey" in tool_names
                assert "evaluate_constraints" in tool_names
                assert "explain_tradeoffs" in tool_names

                # Execute compare_routes via MCP call_tool
                call_res = await session.call_tool(
                    "compare_routes",
                    arguments={
                        "origin": "Vijayawada",
                        "destination": "Visakhapatnam",
                        "budget_inr": 2000.0,
                        "deadline_hours": 6.0,
                        "weight_kg": 5.0,
                        "priority": "DEADLINE_CRITICAL",
                    },
                )
                assert len(call_res.content) > 0
                data = json.loads(call_res.content[0].text)
                assert data["has_feasible_solution"] is True
                assert data["recommended_option"]["option"]["id"] == "BZA-VTZ-RAIL-01"

                # Execute replan_journey via MCP call_tool
                replan_res = await session.call_tool(
                    "replan_journey",
                    arguments={
                        "original_option_id": "BZA-VTZ-RAIL-01",
                        "origin": "Vijayawada",
                        "destination": "Visakhapatnam",
                        "delay_hours": 2.0,
                        "budget_inr": 2000.0,
                        "deadline_hours": 6.0,
                    },
                )
                replan_data = json.loads(replan_res.content[0].text)
                assert replan_data["disrupted_still_feasible"] is False
                assert replan_data["revised_recommended_option"]["option"]["id"] == "BZA-VTZ-ROAD-EXP"

    finally:
        uv_server.should_exit = True
        await server_task
