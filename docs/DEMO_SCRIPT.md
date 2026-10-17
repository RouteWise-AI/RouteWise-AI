# RouteWise AI — Technical Demonstration Script
### Amazon Developer Hackathon: Build, Ship, Shape

This script provides an exact, reproducible walkthrough for judges and evaluators to test all core capabilities of RouteWise AI.

---

## Preparation (20 Seconds)

1. Ensure services are running locally via `python scripts/run_local.py` or separate terminals.
2. Open your browser to `http://localhost:5173`.
3. Check the top status bar:
   - **MCP Status:** Should display `Connected` (green pulse).
   - **AI Provider:** Displays `Mock Mode` (or `AWS Bedrock` if configured).

---

## Scenario 1: The Primary Demonstration Corridor (Vijayawada → Visakhapatnam)

**Goal:** Demonstrate multimodal comparison, budget and deadline enforcement, and grounded ranking.

1. Navigate to the **Command Center** tab.
2. Click the preset button: `⭐ Primary Hackathon Demo`.
   - **Origin:** Vijayawada (BZA)
   - **Destination:** Visakhapatnam (VTZ)
   - **Budget:** ₹2,000
   - **Deadline Window:** 6.0 hours
   - **Payload Weight:** 5.0 kg
   - **Priority:** Deadline-Critical (Reliability Focus)
3. Click **Compare Options via MCP**.
4. **Observe the Results:**
   - **Recommended Plan:** `Andhra Express Freight Rail (Vande Cargo)` (RAIL)
   - **Total Cost:** ₹1,450.00 (under ₹2,000 budget limit)
   - **Duration:** 4.2 hours (well ahead of the 6.0h deadline with +1.8h buffer)
   - **Historical Reliability:** 94%
   - **Tradeoff Rationale:** The engine explicitly explains why Rail won over Highway Express (higher punctuality buffer) and why Air Cargo (₹3,200) was rejected due to hard budget violation.

---

## Scenario 2: Dynamic Disruption Simulation & Autonomous Replanning

**Goal:** Prove resilience when plans change — the core differentiator of RouteWise AI.

1. In the Command Center's recommendation banner, locate the **Simulate Bottleneck / Delay** control.
2. Select `+2.0 Hours Delay` (simulating signal failure near Rajahmundry).
3. Click **Trigger Replan**.
4. You will be transitioned to the **Disruption & Resilient Replanning** dashboard:
   - **Stage 1 (Baseline):** Rail Freight taking 4.2h, ₹1,450.
   - **Stage 2 (Disruption):** Rail transit jumps to 6.2h, violating the 6.0h deadline by 12 minutes (marked **Infeasible**).
   - **Stage 3 (Autonomous Replan):** RouteWise instantly pivots to `Coastal Corridor Highway Express (NH16)`.
   - **Variance Metrics:**
     - Transit duration: 5.5 hours (restores on-time arrival ahead of deadline).
     - Cost: ₹1,100.00 (saves ₹350 vs original rail budget!).
     - Feasibility: **Restored to On-Time**.

---

## Scenario 3: Honest Refusal Principle (Infeasible Stress Test)

**Goal:** Prove the system never hallucinates or claims impossible plans are valid.

1. Return to the **Command Center** tab.
2. Click `⚠️ Infeasible Stress Test`.
   - **Budget:** ₹1,500
   - **Deadline:** 3.0 hours (Strict)
3. Click **Compare Options via MCP**.
4. **Observe the Output:**
   - The engine flags an **Honest Infeasibility Report**.
   - It states that Air Priority (2.3h) arrives on time but costs ₹3,200 (exceeds ₹1,500 budget).
   - Rail Freight (₹1,450) meets the budget but takes 4.2h (misses 3h deadline).
   - **Refusal to Recommend:** RouteWise honestly refuses to endorse an infeasible plan, explaining the closest alternatives.

---

## Scenario 4: Natural Language AI Logistics Assistant

**Goal:** Demonstrate conversational reasoning and session context preservation.

1. Navigate to the **AI Assistant** tab.
2. Click the sample prompt:
   > *"Plan a delivery from Vijayawada to Visakhapatnam within six hours, with a maximum budget of ₹2,000. Prefer a reliable option."*
3. Observe:
   - Tool execution badge: `MCP Tool: compare_routes` executed via Streamable HTTP.
   - Grounded response with itemized costs, arrival timestamps, and carrier details.
4. Follow up in the same session:
   > *"There is a delay of 2 hours on the train. Replan the journey."*
5. Observe:
   - Session context preserved: The agent remembers the origin, destination, and baseline plan without re-asking.
   - Automatically executes `replan_journey` tool via MCP.
   - Recommends switching to Coastal Corridor Highway Express.

---

## Scenario 5: Live MCP Protocol Inspector

**Goal:** Audit real Model Context Protocol execution.

1. Navigate to the **MCP Inspector** tab.
2. Inspect the **Execution Activity Log**:
   - Each tool execution (`compare_routes`, `replan_journey`, `calculate_delivery_cost`) is logged with millisecond duration and `Real MCP Protocol` badge.
   - Click any record to expand and inspect the exact JSON-RPC tool arguments and structured server responses.
3. Review the **Dynamically Discovered MCP Tools** section:
   - Shows all 7 advertised tools discovered dynamically over Streamable HTTP.
