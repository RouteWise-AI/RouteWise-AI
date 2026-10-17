"""
Tests for Bedrock Converse API tool-calling loop using mocked boto3 responses.
Verifies the exact Amazon Bedrock Converse API tool-use continuation flow.
"""

from unittest.mock import MagicMock, patch
import pytest

from app.mcp_client.client import default_mcp_client
from app.providers.bedrock_provider import BedrockProvider
from app.schemas.api import ChatMessage


@pytest.mark.anyio
async def test_bedrock_converse_tool_use_loop():
    provider = BedrockProvider(default_mcp_client)

    # Mock MCP client discover_tools and call_tool
    mock_tools = [
        {
            "name": "compare_routes",
            "description": "Compare routes",
            "inputSchema": {"type": "object", "properties": {}},
        }
    ]
    
    mock_mcp_res = {
        "has_feasible_solution": True,
        "recommended_option": {"option": {"name": "Rail Express"}},
        "refusal_or_tradeoff_explanation": "Rail Express recommended.",
    }

    # First turn: Bedrock asks to use tool 'compare_routes'
    turn_1_response = {
        "stopReason": "tool_use",
        "output": {
            "message": {
                "role": "assistant",
                "content": [
                    {
                        "toolUse": {
                            "toolUseId": "tool-call-1234",
                            "name": "compare_routes",
                            "input": {
                                "origin": "Vijayawada",
                                "destination": "Visakhapatnam",
                                "budget_inr": 2000.0,
                                "deadline_hours": 6.0,
                            },
                        }
                    }
                ],
            }
        },
    }

    # Second turn: Bedrock returns final text after getting toolResult
    turn_2_response = {
        "stopReason": "end_turn",
        "output": {
            "message": {
                "role": "assistant",
                "content": [
                    {
                        "text": "Based on the MCP decision engine analysis, the recommended journey is Rail Express."
                    }
                ],
            }
        },
    }

    mock_client = MagicMock()
    mock_client.converse.side_effect = [turn_1_response, turn_2_response]

    with patch.object(provider, "_get_client", return_value=mock_client), \
         patch.object(provider.mcp_client, "discover_tools", return_value=mock_tools), \
         patch.object(provider.mcp_client, "call_tool", return_value=mock_mcp_res):

        res = await provider.process_chat(
            message="Plan a delivery from Vijayawada to Visakhapatnam",
            history=[],
            session_id="bedrock-test",
        )

        assert res.provider_used == "bedrock"
        assert len(res.tools_executed) == 1
        assert res.tools_executed[0]["tool"] == "compare_routes"
        assert "Rail Express" in res.response
        assert mock_client.converse.call_count == 2

