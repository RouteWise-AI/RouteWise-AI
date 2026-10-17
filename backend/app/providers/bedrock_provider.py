"""
RouteWise AI - Amazon Bedrock Converse API Provider
Uses boto3 bedrock-runtime Converse API with model-driven tool selection over MCP.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional
import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError

from .base import BaseAIProvider
from ..config.settings import settings
from ..schemas.api import ChatMessage, ChatResponse

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are RouteWise AI, an expert travel and logistics decision agent. "
    "Your mission is to help users make intelligent logistics decisions by comparing transport options, "
    "evaluating hard constraints (budget, deadline, payload capacity), analyzing disruptions, and replanning journeys. "
    "You MUST use the provided MCP tools to calculate costs, check deadlines, compare routes, and replan journeys. "
    "Always base your final recommendations strictly on actual MCP tool results. "
    "Never invent carrier names, rates, or arrival times. "
    "If no option satisfies the hard constraints, clearly and honestly explain why and provide the closest alternatives."
)


class BedrockProvider(BaseAIProvider):
    """Amazon Bedrock AI provider utilizing the Converse API and dynamic MCP tool execution."""

    def __init__(self, mcp_client):
        super().__init__(mcp_client)
        self.region = settings.aws_region
        self.model_id = settings.bedrock_model_id
        self._bedrock_client = None

    def get_provider_name(self) -> str:
        return "bedrock"

    def _get_client(self):
        """Lazy initialization of boto3 Bedrock Runtime client."""
        if self._bedrock_client is None:
            # Uses AWS default credential provider chain (env vars, profile, or IAM role)
            session = boto3.Session(region_name=self.region)
            self._bedrock_client = session.client("bedrock-runtime", region_name=self.region)
        return self._bedrock_client

    async def _format_mcp_tools_for_bedrock(self) -> Dict[str, Any]:
        """Convert MCP tool schemas into Bedrock Converse API toolConfig format."""
        mcp_tools = await self.mcp_client.discover_tools()
        bedrock_tools = []
        for t in mcp_tools:
            input_schema = t.get("inputSchema", {})
            # Ensure properties exists
            if "properties" not in input_schema:
                input_schema = {"type": "object", "properties": {}}
            bedrock_tools.append(
                {
                    "toolSpec": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "inputSchema": {"json": input_schema},
                    }
                }
            )
        return {"tools": bedrock_tools}

    async def process_chat(
        self,
        message: str,
        history: List[ChatMessage],
        session_id: str,
    ) -> ChatResponse:
        """Execute Bedrock Converse API tool-use loop with genuine MCP execution."""
        tools_executed: List[Dict[str, Any]] = []

        try:
            client = self._get_client()
        except (NoCredentialsError, BotoCoreError, ClientError) as e:
            return ChatResponse(
                response=(
                    "###  AWS Bedrock Authentication Required\n\n"
                    f"RouteWise AI could not authenticate with Amazon Bedrock in region `{self.region}`:\n"
                    f"```\n{e}\n```\n\n"
                    "**To configure AWS credentials:**\n"
                    "1. Configure AWS CLI with `aws configure` (or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`).\n"
                    "2. Verify model access for `{self.model_id}` in the Amazon Bedrock Console.\n"
                    "3. Alternatively, switch to **Deterministic Mock Mode** in the Settings panel for complete local functionality."
                ),
                provider_used="bedrock",
                model_id=self.model_id,
                tools_executed=[],
                session_id=session_id,
            )

        # Prepare messages in Bedrock Converse format
        messages: List[Dict[str, Any]] = []
        for h in history[-8:]:  # keep recent context
            role = "user" if h.role == "user" else "assistant"
            messages.append({"role": role, "content": [{"text": h.content}]})

        messages.append({"role": "user", "content": [{"text": message}]})

        try:
            tool_config = await self._format_mcp_tools_for_bedrock()
        except Exception as e:
            logger.warning(f"Failed to fetch dynamic MCP tools: {e}")
            tool_config = None

        max_turns = 5
        turn = 0
        final_text = ""

        try:
            while turn < max_turns:
                turn += 1
                kwargs: Dict[str, Any] = {
                    "modelId": self.model_id,
                    "messages": messages,
                    "system": [{"text": SYSTEM_PROMPT}],
                }
                if tool_config:
                    kwargs["toolConfig"] = tool_config

                response = client.converse(**kwargs)
                output = response.get("output", {})
                message_out = output.get("message", {})
                stop_reason = response.get("stopReason")

                messages.append(message_out)

                # Process output content blocks
                content_blocks = message_out.get("content", [])
                for block in content_blocks:
                    if "text" in block:
                        final_text += block["text"] + "\n"

                # Check if model requested a tool execution
                if stop_reason == "tool_use":
                    tool_results_content = []
                    for block in content_blocks:
                        if "toolUse" in block:
                            tool_use = block["toolUse"]
                            tool_use_id = tool_use["toolUseId"]
                            tool_name = tool_use["name"]
                            tool_args = tool_use.get("input", {})

                            # Execute tool via genuine MCP client
                            try:
                                mcp_res = await self.mcp_client.call_tool(
                                    tool_name, tool_args, provider_mode="bedrock"
                                )
                                tools_executed.append(
                                    {
                                        "tool": tool_name,
                                        "arguments": tool_args,
                                        "result_data": mcp_res,
                                        "is_real_mcp": True,
                                    }
                                )
                                tool_results_content.append(
                                    {
                                        "toolResult": {
                                            "toolUseId": tool_use_id,
                                            "content": [{"json": mcp_res}],
                                            "status": "success",
                                        }
                                    }
                                )
                            except Exception as tool_err:
                                tools_executed.append(
                                    {
                                        "tool": tool_name,
                                        "arguments": tool_args,
                                        "error": str(tool_err),
                                        "is_real_mcp": False,
                                    }
                                )
                                tool_results_content.append(
                                    {
                                        "toolResult": {
                                            "toolUseId": tool_use_id,
                                            "content": [{"text": f"Error executing tool: {tool_err}"}],
                                            "status": "error",
                                        }
                                    }
                                )

                    # Append tool results to message flow and loop back to model
                    messages.append(
                        {
                            "role": "user",
                            "content": tool_results_content,
                        }
                    )
                else:
                    # Model finished reasoning
                    break

            return ChatResponse(
                response=final_text.strip() or "No response generated by model.",
                provider_used="bedrock",
                model_id=self.model_id,
                tools_executed=tools_executed,
                session_id=session_id,
            )

        except (ClientError, BotoCoreError) as e:
            return ChatResponse(
                response=(
                    "###  Amazon Bedrock Runtime Error\n\n"
                    f"Encountered AWS service exception: `{e}`\n\n"
                    "Check that the model ID `{self.model_id}` is enabled in region `{self.region}` "
                    "and that your IAM user/role has `bedrock:InvokeModel` permissions."
                ),
                provider_used="bedrock",
                model_id=self.model_id,
                tools_executed=tools_executed,
                session_id=session_id,
            )
