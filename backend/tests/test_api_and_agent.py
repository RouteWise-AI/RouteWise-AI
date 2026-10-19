"""
Integration tests for RouteWise AI FastAPI Backend and Agent Orchestration
"""

import asyncio
import pytest
import uvicorn
from fastapi.testclient import TestClient

from app.agent.orchestrator import agent_orchestrator
from app.main import app
from app.mcp_client.client import default_mcp_client
from app.providers.mock_provider import MockProvider
from app.schemas.api import ChatMessage, ChatRequest
from mcp_server.server import create_app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["app"] == "RouteWise AI"


def test_api_config(client):
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "corridors" in data
    assert len(data["corridors"]) >= 3


def test_agent_chat_missing_parameters():
    mock_prov = MockProvider(default_mcp_client)
    res = asyncio.run(
        mock_prov.process_chat(
            message="Hello, can you help me plan something?",
            history=[],
            session_id="test-session",
        )
    )
    assert "To optimize your journey" in res.response
    assert len(res.tools_executed) == 0


@pytest.mark.anyio
async def test_end_to_end_agent_and_mcp_flow():
    """Start in-process MCP server and test end-to-end chat flow."""
    test_port = 8767
    test_app = create_app()
    config = uvicorn.Config(test_app, host="127.0.0.1", port=test_port, log_level="error")
    uv_server = uvicorn.Server(config)
    server_task = asyncio.create_task(uv_server.serve())
    await asyncio.sleep(0.5)

    try:
        # Point default client to test server
        default_mcp_client.server_url = f"http://127.0.0.1:{test_port}/mcp"
        default_mcp_client.base_url = f"http://127.0.0.1:{test_port}"

        # 1. Test chat query
        chat_req = ChatRequest(
            message="Plan a delivery from Vijayawada to Visakhapatnam within six hours, with a maximum budget of ₹2,000. Prefer a reliable option.",
            session_id="e2e-session",
        )
        chat_resp = await agent_orchestrator.handle_chat(chat_req)
        assert chat_resp.provider_used in ("mock", "mock_fallback")
        assert len(chat_resp.tools_executed) == 1
        assert chat_resp.tools_executed[0]["tool"] == "compare_routes"
        assert "Vande Cargo" in chat_resp.response or "Andhra Express" in chat_resp.response

        # 2. Test disruption / replan query in same session
        replan_req = ChatRequest(
            message="There is a delay of 2 hours on the train. Replan the journey.",
            session_id="e2e-session",
        )
        replan_resp = await agent_orchestrator.handle_chat(replan_req)
        assert len(replan_resp.tools_executed) == 1
        assert replan_resp.tools_executed[0]["tool"] == "replan_journey"
        assert "Disruption Evaluated" in replan_resp.response or "REPLAN TRIGGERED" in replan_resp.response

        # 3. Test activity inspector has records
        test_client = TestClient(app)
        act_resp = test_client.get("/api/mcp/activity")
        assert act_resp.status_code == 200
        records = act_resp.json()
        assert len(records) >= 2
        tool_names = [r["tool_name"] for r in records]
        assert "compare_routes" in tool_names
        assert "replan_journey" in tool_names

    finally:
        uv_server.should_exit = True
        await server_task
