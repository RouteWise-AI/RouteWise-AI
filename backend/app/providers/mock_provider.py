"""
RouteWise AI - Deterministic Mock AI Provider
Operates without AWS credentials, parsing natural language queries, invoking real MCP tools,
and generating grounded explanations.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple
from .base import BaseAIProvider
from ..schemas.api import ChatMessage, ChatResponse

WORD_TO_NUM = {
    "one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0, "five": 5.0,
    "six": 6.0, "seven": 7.0, "eight": 8.0, "nine": 9.0, "ten": 10.0,
}


class MockProvider(BaseAIProvider):
    """Deterministic local AI provider using rule-based NLU and genuine MCP tool calls."""

    def get_provider_name(self) -> str:
        return "mock"

    def _extract_constraints(self, text: str, history: Optional[List[ChatMessage]] = None) -> Dict[str, Any]:
        """Extract structured logistics constraints from natural language query and context."""
        constraints: Dict[str, Any] = {}
        lower = text.lower()

        # Origin & Destination patterns
        route_match = re.search(r"(?:from\s+)?([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:[\.,;\n]|\s+(?:within|with|under|in|for|having)|$)", lower)
        if route_match:
            cand_orig = route_match.group(1).strip().title()
            cand_dest = route_match.group(2).strip().title()
            # Clean common noise words
            cand_orig = re.sub(r"^(plan|a|delivery|journey|shipment|send|transport)\s+", "", cand_orig, flags=re.IGNORECASE).strip()
            if cand_orig and cand_dest:
                constraints["origin"] = cand_orig
                constraints["destination"] = cand_dest

        # Known cities shortcut fallback
        known_cities = ["Vijayawada", "Visakhapatnam", "Hyderabad", "Bengaluru", "Chennai"]
        if "origin" not in constraints:
            for c in known_cities:
                if c.lower() in lower:
                    if "origin" not in constraints:
                        constraints["origin"] = c
                    elif "destination" not in constraints and constraints["origin"] != c:
                        constraints["destination"] = c

        # Context preservation from session history if not found in current message
        if ("origin" not in constraints or "destination" not in constraints) and history:
            for prev_msg in reversed(history):
                prev_lower = prev_msg.content.lower()
                for c in known_cities:
                    if c.lower() in prev_lower:
                        if "origin" not in constraints:
                            constraints["origin"] = c
                        elif "destination" not in constraints and constraints["origin"] != c:
                            constraints["destination"] = c
                if "origin" in constraints and "destination" in constraints:
                    break

        # Deadline extraction (hours)
        deadline_match = re.search(r"within\s+(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:hours|hrs|hr|h)?", lower)
        if not deadline_match:
            deadline_match = re.search(r"(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:hours|hrs|hr|h)\b", lower)

        if deadline_match:
            val_str = deadline_match.group(1)
            val = WORD_TO_NUM.get(val_str, None) or float(val_str)
            constraints["deadline_hours"] = float(val)
        else:
            constraints["deadline_hours"] = 6.0

        # Budget extraction (INR)
        budget_targeted = re.search(
            r"(?:budget(?:\s+of)?|max(?:\s+budget)?|cost(?:\s+under)?|under)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]+)?)",
            text,
            re.IGNORECASE,
        )
        if budget_targeted and budget_targeted.group(1):
            clean_num = budget_targeted.group(1).replace(",", "")
            if clean_num:
                constraints["budget_inr"] = float(clean_num)
        else:
            # Look for explicit rupee symbol or Rs prefix
            budget_explicit = re.search(
                r"(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]+)?)|([0-9,]+(?:\.[0-9]+)?)\s*(?:₹|rs\.?|inr|rupees)",
                text,
                re.IGNORECASE,
            )
            if budget_explicit:
                raw_val = budget_explicit.group(1) or budget_explicit.group(2)
                if raw_val:
                    clean_num = raw_val.replace(",", "")
                    if clean_num:
                        constraints["budget_inr"] = float(clean_num)

        if "budget_inr" not in constraints:
            constraints["budget_inr"] = 2000.0

        # Priority extraction
        if any(w in lower for w in ["reliab", "on-time", "safe", "punctual"]):
            constraints["priority"] = "DEADLINE_CRITICAL"
        elif any(w in lower for w in ["cheap", "cost", "econom", "low price"]):
            constraints["priority"] = "CHEAPEST"
        elif any(w in lower for w in ["fast", "quick", "urgent", "speed", "express"]):
            constraints["priority"] = "FASTEST"
        else:
            constraints["priority"] = "BALANCED"

        # Weight extraction
        weight_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)", lower)
        if weight_match:
            constraints["weight_kg"] = float(weight_match.group(1))
        else:
            constraints["weight_kg"] = 5.0

        # Check for delay / replanning intent
        delay_match = re.search(r"(?:delay|delayed|disrupt(?:ion)?)\s*(?:of)?\s*(\d+(?:\.\d+)?|one|two|three)\s*(?:hours|hrs|hr|h)?", lower)
        if delay_match or "replan" in lower or "disrupt" in lower:
            constraints["is_replan"] = True
            if delay_match:
                d_val_str = delay_match.group(1)
                constraints["delay_hours"] = WORD_TO_NUM.get(d_val_str, None) or float(d_val_str)
            else:
                constraints["delay_hours"] = 2.0
        else:
            constraints["is_replan"] = False

        return constraints

    async def process_chat(
        self,
        message: str,
        history: List[ChatMessage],
        session_id: str,
    ) -> ChatResponse:
        """Execute deterministic mock agent reasoning with genuine MCP tool calls."""
        constraints = self._extract_constraints(message, history)
        tools_executed: List[Dict[str, Any]] = []

        # Check for essential missing parameters
        if not constraints.get("origin") or not constraints.get("destination"):
            response_text = (
                "Welcome to **RouteWise AI**! I am your AI travel and logistics decision agent.\n\n"
                "To optimize your journey and compare transport options, please provide:\n"
                "1. **Origin city** (e.g., Vijayawada)\n"
                "2. **Destination city** (e.g., Visakhapatnam)\n"
                "3. **Required delivery window** (e.g., within 6 hours)\n"
                "4. **Maximum budget** (e.g., ₹2,000)\n\n"
                "*Example query:* \"Plan a delivery from Vijayawada to Visakhapatnam within six hours, with a maximum budget of ₹2,000. Prefer a reliable option.\""
            )
            return ChatResponse(
                response=response_text,
                provider_used="mock",
                model_id="deterministic-mock-v1",
                tools_executed=[],
                extracted_constraints=constraints,
                session_id=session_id,
            )

        origin = constraints["origin"]
        destination = constraints["destination"]
        budget = constraints.get("budget_inr", 2000.0)
        deadline = constraints.get("deadline_hours", 6.0)
        priority = constraints.get("priority", "BALANCED")
        weight = constraints.get("weight_kg", 5.0)

        # Decide which MCP tool to invoke
        if constraints.get("is_replan"):
            tool_name = "replan_journey"
            tool_args = {
                "original_option_id": "BZA-VTZ-RAIL-01",
                "origin": origin,
                "destination": destination,
                "delay_hours": constraints.get("delay_hours", 2.0),
                "budget_inr": budget,
                "deadline_hours": deadline,
                "weight_kg": weight,
                "priority": priority,
            }
        else:
            tool_name = "compare_routes"
            tool_args = {
                "origin": origin,
                "destination": destination,
                "budget_inr": budget,
                "deadline_hours": deadline,
                "weight_kg": weight,
                "priority": priority,
            }

        # Call MCP server via genuine MCP client
        try:
            tool_result = await self.mcp_client.call_tool(tool_name, tool_args, provider_mode="mock")
            tools_executed.append(
                {
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result_summary": f"Executed via Streamable HTTP MCP (status: success)",
                    "result_data": tool_result,
                }
            )
        except Exception as e:
            tools_executed.append(
                {
                    "tool": tool_name,
                    "arguments": tool_args,
                    "error": str(e),
                }
            )
            return ChatResponse(
                response=f"Error executing MCP tool '{tool_name}' through Streamable HTTP: {e}. Please ensure the MCP server is running on port 8000.",
                provider_used="mock",
                model_id="deterministic-mock-v1",
                tools_executed=tools_executed,
                extracted_constraints=constraints,
                session_id=session_id,
            )

        # Formulate grounded response based on actual tool output
        if tool_name == "compare_routes":
            response_text = self._format_comparison_response(origin, destination, budget, deadline, priority, tool_result)
        else:
            response_text = self._format_replan_response(tool_result, constraints.get("delay_hours", 2.0), deadline, budget)

        return ChatResponse(
            response=response_text,
            provider_used="mock",
            model_id="deterministic-mock-v1",
            tools_executed=tools_executed,
            extracted_constraints=constraints,
            session_id=session_id,
        )

    def _format_comparison_response(
        self,
        origin: str,
        destination: str,
        budget: float,
        deadline: float,
        priority: str,
        result: Dict[str, Any],
    ) -> str:
        has_feasible = result.get("has_feasible_solution", False)
        rec = result.get("recommended_option")

        lines = [
            f"### Logistics Recommendation: {origin} -> {destination}",
            f"**Constraints evaluated:** Budget: ₹{budget:,.0f} | Deadline: {deadline:.1f} hrs | Priority: {priority}\n",
        ]

        if has_feasible and rec:
            opt = rec.get("option", {})
            cost = rec.get("cost", {})
            dline = rec.get("deadline", {})

            lines.extend([
                f"**Recommended Option:** **{opt.get('name')}** ({opt.get('mode')})",
                f"- **Carrier:** {opt.get('carrier')}",
                f"- **Estimated Cost:** ₹{cost.get('total_cost_inr', 0):,.2f} *(within ₹{budget:,.0f} budget)*",
                f"- **Estimated Transit Duration:** {dline.get('estimated_duration_hours')} hours *(Arrival: {dline.get('estimated_arrival_time')})*",
                f"- **Deadline Margin:** {dline.get('margin_hours'):+.1f} hours buffer *(Status: {dline.get('status')})*",
                f"- **Historical Reliability:** {int(opt.get('reliability_score', 0) * 100)}%",
                f"- **Estimated Carbon Emissions:** {opt.get('carbon_emissions_kg', 0)} kg CO₂",
                "",
                "**Decision Rationale:**",
                f"> {result.get('refusal_or_tradeoff_explanation', '')}",
                "",
                "**Alternative Options Considered:**",
            ])

            for alt in result.get("alternatives", []):
                a_opt = alt.get("option", {})
                a_cost = alt.get("cost", {})
                a_dline = alt.get("deadline", {})
                a_con = alt.get("constraints", {})
                status_icon = " Feasible" if a_con.get("overall_feasible") else " Infeasible"
                reasons = f" ({'; '.join(a_con.get('rejection_reasons', []))})" if a_con.get("rejection_reasons") else ""
                lines.append(
                    f"* **{a_opt.get('name')}** ({a_opt.get('mode')}): ₹{a_cost.get('total_cost_inr', 0):,.0f}, "
                    f"{a_dline.get('estimated_duration_hours')} hrs — **{status_icon}**{reasons}"
                )
        else:
            lines.extend([
                "> **Honest Decision Engine Alert:** No sample transport options meet all hard constraints.",
                "",
                f"{result.get('refusal_or_tradeoff_explanation', '')}",
                "",
                "**Suggested Next Steps:**",
                "- Increase budget to enable expedited Air or Express modes.",
                "- Or relax delivery window to permit cost-effective standard Rail or Road freight.",
            ])

        lines.extend([
            "",
            "---",
            "*Source: RouteWise AI Deterministic Decision Engine via genuine MCP Streamable HTTP protocol. Simulated estimates.*",
        ])
        return "\n".join(lines)

    def _format_replan_response(
        self,
        result: Dict[str, Any],
        delay_hours: float,
        deadline: float,
        budget: float,
    ) -> str:
        revised = result.get("revised_recommended_option")
        orig_dur = result.get("original_duration_hours", 0)
        disrupted_dur = result.get("disrupted_duration_hours", 0)

        lines = [
            f"###  Disruption Evaluated: {delay_hours:.1f}-Hour Delay Incident",
            f"- **Original Plan:** Option `{result.get('original_option_id')}` ({orig_dur:.1f} hrs, ₹{result.get('original_cost_inr', 0):,.0f})",
            f"- **Disrupted Duration:** {disrupted_dur:.1f} hrs (Deadline limit: {deadline:.1f} hrs)",
            f"- **Original Feasibility:** {' Feasible' if result.get('disrupted_still_feasible') else ' Infeasible (Misses Deadline)'}\n",
            "**Replanning Decision:**",
            f"> {result.get('decision_explanation', '')}\n",
        ]

        if revised:
            r_opt = revised.get("option", {})
            r_cost = revised.get("cost", {})
            r_dline = revised.get("deadline", {})
            lines.extend([
                f"**Revised Recommended Plan:** **{r_opt.get('name')}** ({r_opt.get('mode')})",
                f"- **New Estimated Arrival:** {r_dline.get('estimated_arrival_time')} ({r_dline.get('estimated_duration_hours')} hrs)",
                f"- **Cost Variance:** ₹{result.get('cost_delta_inr', 0):+,.2f} (Total: ₹{r_cost.get('total_cost_inr', 0):,.2f})",
                f"- **Time Delta vs Original Plan:** {result.get('duration_delta_hours', 0):+.1f} hrs",
            ])

        risks = result.get("remaining_risks", [])
        if risks:
            lines.append("\n**Remaining Transit Risks:**")
            for r in risks:
                lines.append(f"-  {r}")

        lines.extend([
            "",
            "---",
            "*Replanned autonomously via RouteWise AI `replan_journey` MCP tool.*",
        ])
        return "\n".join(lines)
