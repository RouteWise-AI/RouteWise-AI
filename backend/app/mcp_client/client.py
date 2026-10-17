"""
RouteWise AI - Dedicated MCP Client
Communicates with the self-hosted MCP server over Streamable HTTP using the official Python MCP SDK.
"""

from __future__ import annotations

import json
import os
import time
import uuid
from typing import Any, Dict, List, Optional
import httpx

from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client
from .activity_logger import MCPToolCallRecord, mcp_activity_logger


class MCPClientError(Exception):
    """Base exception for MCP client communication errors."""
    pass


class RouteWiseMCPClient:
    """Official MCP SDK client for RouteWise AI logistics server."""

    def __init__(
        self,
        server_url: Optional[str] = None,
        timeout_seconds: float = 12.0,
    ):
        self.server_url = server_url or os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")
        self.timeout_seconds = timeout_seconds
        # Derive base server URL for health check
        self.base_url = self.server_url.rsplit("/mcp", 1)[0] if "/mcp" in self.server_url else self.server_url

    async def check_health(self) -> Dict[str, Any]:
        """Check if MCP server is reachable and reports healthy status."""
        health_url = f"{self.base_url}/health"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(health_url)
                if resp.status_code == 200:
                    return resp.json()
                return {
                    "status": "unhealthy",
                    "code": resp.status_code,
                    "detail": resp.text,
                }
        except Exception as e:
            return {
                "status": "unreachable",
                "server_url": self.server_url,
                "error": str(e),
                "suggestion": "Ensure the MCP server is started with 'python mcp_server/server.py'",
            }

    async def discover_tools(self) -> List[Dict[str, Any]]:
        """Dynamically discover available tools and their JSON schemas via MCP protocol."""
        try:
            async with streamable_http_client(self.server_url) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    list_res = await session.list_tools()
                    tools_data = []
                    for tool in list_res.tools:
                        tools_data.append(
                            {
                                "name": tool.name,
                                "description": tool.description,
                                "inputSchema": tool.inputSchema if hasattr(tool, "inputSchema") else {},
                            }
                        )
                    return tools_data
        except Exception as e:
            raise MCPClientError(f"Failed to discover tools from MCP server at {self.server_url}: {e}") from e

    async def call_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        provider_mode: str = "mock",
    ) -> Dict[str, Any]:
        """Execute a tool call over real Streamable HTTP MCP session and log activity."""
        call_id = f"mcp-{uuid.uuid4().hex[:8]}"
        start_time = time.perf_counter()

        try:
            async with streamable_http_client(self.server_url) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    res = await session.call_tool(tool_name, arguments=arguments)
                    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    if not res.content:
                        raise MCPClientError(f"Tool '{tool_name}' returned empty response content")

                    content_text = res.content[0].text
                    try:
                        parsed = json.loads(content_text)
                    except json.JSONDecodeError:
                        parsed = {"raw": content_text}

                    # Log success to inspector
                    mcp_activity_logger.log(
                        MCPToolCallRecord(
                            id=call_id,
                            tool_name=tool_name,
                            arguments=arguments,
                            result=parsed,
                            is_real_mcp=True,
                            provider_mode=provider_mode,
                            status="SUCCESS",
                            duration_ms=elapsed_ms,
                        )
                    )
                    return parsed

        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            # Log failure to inspector
            mcp_activity_logger.log(
                MCPToolCallRecord(
                    id=call_id,
                    tool_name=tool_name,
                    arguments=arguments,
                    result={"error": str(e)},
                    is_real_mcp=False,
                    provider_mode=provider_mode,
                    status="ERROR",
                    duration_ms=elapsed_ms,
                    error_message=str(e),
                )
            )
            raise MCPClientError(f"Error calling MCP tool '{tool_name}': {e}") from e


# Global default client
default_mcp_client = RouteWiseMCPClient()

