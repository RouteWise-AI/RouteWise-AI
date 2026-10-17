"""
RouteWise AI - Agent Orchestrator
Coordinates provider selection (Mock vs Bedrock), session memory, and MCP tool orchestration.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

from ..config.settings import settings
from ..mcp_client.client import default_mcp_client, RouteWiseMCPClient
from ..providers.base import BaseAIProvider
from ..providers.bedrock_provider import BedrockProvider
from ..providers.mock_provider import MockProvider
from ..schemas.api import ChatMessage, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Manages conversational session history and selects the appropriate AI provider."""

    def __init__(self, mcp_client: Optional[RouteWiseMCPClient] = None):
        self.mcp_client = mcp_client or default_mcp_client
        self.mock_provider = MockProvider(self.mcp_client)
        self.bedrock_provider = BedrockProvider(self.mcp_client)
        # In-memory session history store: session_id -> list of ChatMessage
        self._sessions: Dict[str, List[ChatMessage]] = {}

    def get_provider(self, override: Optional[str] = None) -> BaseAIProvider:
        mode = (override or settings.ai_provider).lower()
        if mode == "bedrock":
            return self.bedrock_provider
        return self.mock_provider

    def get_session_history(self, session_id: str) -> List[ChatMessage]:
        return self._sessions.get(session_id, [])

    def append_message(self, session_id: str, message: ChatMessage) -> None:
        if session_id not in self._sessions:
            self._sessions[session_id] = []
        self._sessions[session_id].append(message)
        # Keep last 20 messages per session
        if len(self._sessions[session_id]) > 20:
            self._sessions[session_id] = self._sessions[session_id][-20:]

    def clear_session(self, session_id: str) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].clear()

    async def handle_chat(self, request: ChatRequest) -> ChatResponse:
        session_id = request.session_id or "default-session"
        history = self.get_session_history(session_id)

        # Merge any client-supplied history
        if request.history:
            history = request.history

        provider = self.get_provider(request.override_provider)

        # Process message
        response = await provider.process_chat(
            message=request.message,
            history=history,
            session_id=session_id,
        )

        # Record in memory
        self.append_message(session_id, ChatMessage(role="user", content=request.message))
        self.append_message(session_id, ChatMessage(role="assistant", content=response.response))

        return response


# Global orchestrator singleton
agent_orchestrator = AgentOrchestrator()

