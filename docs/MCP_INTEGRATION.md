# Model Context Protocol (MCP) Integration Guide

## 1. Protocol Architecture & Compliance

RouteWise AI implements a self-hosted Python MCP server and a dedicated Python MCP client communicating over **Streamable HTTP**, compliant with the official Model Context Protocol specifications and Python SDK 2.x (`mcp>=2.0.0`).

### Transport Details:
- **Server Endpoint:** `http://127.0.0.1:8000/mcp`
- **Transport Type:** Streamable HTTP (supporting bidirectional session streaming over HTTP POST, GET, and DELETE).
- **Session Lifecycle:**
  1. Client sends initial HTTP POST request to `/mcp`.
  2. Server generates a unique `Session-ID` and establishes transport streams.
  3. Client executes `session.initialize()` JSON-RPC handshake.
  4. Client requests dynamic tool discovery via `session.list_tools()`.
  5. Client calls tools using `session.call_tool(tool_name, arguments)`.
  6. Client terminates session gracefully via HTTP DELETE.

---

## 2. The 7 Registered MCP Decision Tools

| Tool Name | Purpose | Primary Inputs | Key Outputs |
| :--- | :--- | :--- | :--- |
| `compare_routes` | Multimodal candidate ranking against budget, deadline, and priority | `origin`, `destination`, `budget_inr`, `deadline_hours`, `weight_kg`, `priority` | Feasible options, recommended option, rejection reasons, tradeoff notes |
| `calculate_delivery_cost` | Itemized freight tariff with weight and handling surcharges | `option_id`, `weight_kg`, `shipment_type`, `declared_value_inr` | Base cost, weight fee, handling fee, total cost in ₹ INR |
| `check_delivery_deadline` | Timezone-aware arrival and margin calculation | `departure_time`, `duration_hours`, `deadline_hours` | Estimated arrival, margin buffer in hours, status (ON_TIME, AT_RISK, LATE) |
| `simulate_delay` | Simulates bottleneck or disruption event | `option_id`, `delay_hours`, `is_cancelled`, `cost_increase_pct` | Disruption metadata, revised duration and arrival |
| `replan_journey` | Re-evaluates all options post-disruption and pivots | `original_option_id`, `origin`, `destination`, `delay_hours`, `budget_inr`, `deadline_hours` | Revised plan, cost delta (₹), duration delta (hrs), decision explanation |
| `evaluate_constraints` | Hard constraint compliance check | `option_id`, `budget_inr`, `deadline_hours`, `weight_kg` | Constraint flags (`is_budget_met`, `is_deadline_met`), failure reasons |
| `explain_tradeoffs` | Multi-criteria tradeoff synthesis | `origin`, `destination`, `budget_inr`, `deadline_hours`, `priority` | Structured pros/cons, carbon footprint, reliability metrics |

---

## 3. Dynamic Tool Discovery & Bedrock Schema Mapping

Tools are **never hardcoded** on the client. The MCP client dynamically discovers available tools at runtime:

```python
async with streamable_http_client("http://127.0.0.1:8000/mcp") as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools_list = await session.list_tools()
        # tools_list.tools contains name, description, and inputSchema
```

When operating in Amazon Bedrock mode, RouteWise AI dynamically converts the MCP tool schemas directly into Bedrock Converse API `toolConfig` specifications:

```python
bedrock_tools = [
    {
        "toolSpec": {
            "name": t.name,
            "description": t.description,
            "inputSchema": {"json": t.inputSchema}
        }
    }
    for t in tools_list.tools
]
```

---

## 4. Standalone MCP Verification

To verify the MCP server independently without running the UI or backend:

```bash
# 1. Start the MCP server in terminal 1:
python mcp_server/server.py

# 2. Run the connection verification script in terminal 2:
python scripts/test_mcp_connection.py
```

Expected output:
```text
Connecting to RouteWise MCP Server at: http://127.0.0.1:8000/mcp...

--- 1. MCP Health Check ---
{
  "status": "healthy",
  "server": "routewise-logistics-server",
  "protocol": "Model Context Protocol (MCP) Streamable HTTP",
  "tools_count": 7
}

--- 2. Discovering Tools via MCP Protocol ---
Discovered 7 tools:
  * compare_routes: Compare transport and delivery options...
  * calculate_delivery_cost: Calculate itemized freight cost...
  * check_delivery_deadline: Evaluate arrival time...
  * simulate_delay: Simulate transit delays...
  * replan_journey: Re-evaluate and select the best alternative...
  * evaluate_constraints: Check candidate journey against budget...
  * explain_tradeoffs: Explain tradeoffs between cost, duration...

--- 3. Calling 'compare_routes' via Streamable HTTP ---
Execution Result:
  * Feasible Solution: True
  * Recommended Option: Andhra Express Freight Rail (Vande Cargo) (RAIL)
  * Total Cost: ₹1450.0
  * Duration: 4.2 hrs (Status: DeadlineStatus.ON_TIME)

[SUCCESS] MCP Streamable HTTP connection and tool execution verified successfully.
```

