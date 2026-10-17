"""
Tests for RouteWise AI MCP Client and Activity Logger
"""

import asyncio
import pytest
import uvicorn
from app.mcp_client.activity_logger import ActivityLogger, MCPToolCallRecord
from app.mcp_client.client import MCPClientError, RouteWiseMCPClient
from mcp_server.server import create_app


def test_activity_logger():
    logger = ActivityLogger(max_records=5)
    for i in range(10):
        logger.log(
            MCPToolCallRecord(
                id=f"id-{i}",
                tool_name="compare_routes",
                arguments={"test": i},
                result={"status": "ok"},
            )
        )
    recent = logger.get_recent(limit=10)
    assert len(recent) == 5
    assert recent[0].id == "id-9"

    logger.clear()
    assert len(logger.get_recent()) == 0


@pytest.mark.anyio
async def test_mcp_client_unreachable_server():
    client = RouteWiseMCPClient(server_url="http://127.0.0.1:9999/mcp")
    health = await client.check_health()
    assert health["status"] == "unreachable"

    with pytest.raises(MCPClientError):
        await client.discover_tools()


@pytest.mark.anyio
async def test_mcp_client_call_tool_and_logging():
    test_port = 8766
    test_app = create_app()
    config = uvicorn.Config(test_app, host="127.0.0.1", port=test_port, log_level="error")
    uv_server = uvicorn.Server(config)
    task = asyncio.create_task(uv_server.serve())
    await asyncio.sleep(0.5)

    try:
        client = RouteWiseMCPClient(server_url=f"http://127.0.0.1:{test_port}/mcp")
        health = await client.check_health()
        assert health["status"] == "healthy"

        tools = await client.discover_tools()
        assert len(tools) == 7

        res = await client.call_tool(
            "calculate_delivery_cost",
            arguments={"option_id": "BZA-VTZ-RAIL-01", "weight_kg": 8.0},
        )
        assert res["total_cost_inr"] > 0
    finally:
        uv_server.should_exit = True
        await task
