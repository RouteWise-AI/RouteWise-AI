"""
RouteWise AI - Base AI Provider
Abstract interface for LLM agent providers with tool calling capabilities.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from ..mcp_client.client import RouteWiseMCPClient
from ..schemas.api import ChatMessage, ChatResponse


class BaseAIProvider(ABC):
    """Abstract interface for AI agent providers."""

    def __init__(self, mcp_client: RouteWiseMCPClient):
        self.mcp_client = mcp_client

    @abstractmethod
    async def process_chat(
        self,
        message: str,
        history: List[ChatMessage],
        session_id: str,
    ) -> ChatResponse:
        """Process user message, coordinate MCP tool calls, and produce grounded response."""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return provider identifier (e.g. 'mock' or 'bedrock')."""
        pass

