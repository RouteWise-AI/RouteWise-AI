"""
RouteWise AI - MCP Connection Verification Script
Tests Streamable HTTP connection, tool discovery, and tool execution without Bedrock or UI.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Setup paths
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.mcp_client.client import RouteWiseMCPClient


async def main():
    mcp_url = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")
    print(f"Connecting to RouteWise MCP Server at: {mcp_url}...")
    client = RouteWiseMCPClient(server_url=mcp_url)

    # 1. Health check
    health = await client.check_health()
    print("\n--- 1. MCP Health Check ---")
    print(json.dumps(health, indent=2))
    if health.get("status") not in ("healthy", "ok"):
        print("\n[WARNING] MCP Server health endpoint did not return 'healthy'.")
        print("Please ensure the MCP server is running: python mcp_server/server.py")
        sys.exit(1)

    # 2. Tool discovery
    print("\n--- 2. Discovering Tools via MCP Protocol ---")
    tools = await client.discover_tools()
    print(f"Discovered {len(tools)} tools:")
    for t in tools:
        print(f"  * {t['name']}: {t['description']}")

    # 3. Call tool
    print("\n--- 3. Calling 'compare_routes' via Streamable HTTP ---")
    test_args = {
        "origin": "Vijayawada",
        "destination": "Visakhapatnam",
        "budget_inr": 2000.0,
        "deadline_hours": 6.0,
        "priority": "BALANCED",
    }
    result = await client.call_tool("compare_routes", test_args)
    print("Execution Result:")
    print(f"  * Feasible Solution: {result.get('has_feasible_solution')}")
    rec = result.get("recommended_option")
    if rec:
        opt = rec.get("option", {})
        cost = rec.get("cost", {})
        deadline = rec.get("deadline", {})
        print(f"  * Recommended Option: {opt.get('name')} ({opt.get('mode')})")
        print(f"  * Total Cost: ₹{cost.get('total_cost_inr')}")
        print(f"  * Duration: {deadline.get('estimated_duration_hours')} hrs (Status: {deadline.get('status')})")

    print("\n[SUCCESS] MCP Streamable HTTP connection and tool execution verified successfully.")


if __name__ == "__main__":
    asyncio.run(main())
