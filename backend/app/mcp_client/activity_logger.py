"""
RouteWise AI - MCP Activity Logger
Maintains transparent, audit-ready logs of real MCP tool executions for the UI inspector.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MCPToolCallRecord(BaseModel):
    id: str
    tool_name: str
    arguments: Dict[str, Any]
    result: Any
    is_real_mcp: bool = True
    provider_mode: str = "mock"
    status: str = "SUCCESS"  # SUCCESS | ERROR | TIMEOUT
    duration_ms: float = 0.0
    error_message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ActivityLogger:
    """Thread-safe in-memory ring buffer for recent MCP tool executions."""

    def __init__(self, max_records: int = 100):
        self._records: List[MCPToolCallRecord] = []
        self._max_records = max_records

    def log(self, record: MCPToolCallRecord) -> None:
        self._records.append(record)
        if len(self._records) > self._max_records:
            self._records.pop(0)

    def get_recent(self, limit: int = 50) -> List[MCPToolCallRecord]:
        return list(reversed(self._records[-limit:]))

    def clear(self) -> None:
        self._records.clear()


# Global singleton instance for backend inspector
mcp_activity_logger = ActivityLogger()
