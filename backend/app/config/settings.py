"""
RouteWise AI - Application Configuration
Safe loading of environment variables without hardcoded secrets.
"""

import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env file from project root or backend
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env", override=True)


class Settings(BaseModel):
    # App
    app_name: str = "RouteWise AI"
    app_version: str = "1.0.0"
    tagline: str = "Smarter Decisions for Every Journey."
    environment: str = os.getenv("ENVIRONMENT", "development")

    # AI Provider
    ai_provider: str = os.getenv("AI_PROVIDER", "mock").lower()  # "mock" or "bedrock"

    # AWS Configuration
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    aws_profile: str = os.getenv("AWS_PROFILE", "default")
    bedrock_model_id: str = os.getenv(
        "BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-5-5"
    )

    # MCP Server
    mcp_server_host: str = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
    mcp_server_port: int = int(os.getenv("MCP_SERVER_PORT", "8000"))
    mcp_server_path: str = os.getenv("MCP_SERVER_PATH", "/mcp")
    mcp_server_url: str = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")

    # Backend
    backend_host: str = os.getenv("HOST", os.getenv("BACKEND_HOST", "0.0.0.0"))
    backend_port: int = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8001")))
    cors_origins: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_bedrock_auth(self) -> bool:
        """Check if any supported Bedrock authentication is present without exposing secrets."""
        has_bearer = bool(os.getenv("AWS_BEARER_TOKEN_BEDROCK", "").strip())
        has_iam = bool(os.getenv("AWS_ACCESS_KEY_ID", "").strip() and os.getenv("AWS_SECRET_ACCESS_KEY", "").strip())
        return has_bearer or has_iam

    @property
    def bedrock_auth_type(self) -> str:
        """Return non-sensitive label of the active Bedrock auth mechanism."""
        if bool(os.getenv("AWS_BEARER_TOKEN_BEDROCK", "").strip()):
            return "bearer_token"
        if bool(os.getenv("AWS_ACCESS_KEY_ID", "").strip()):
            return "iam_keys"
        return "none"

    # Map & Routing Provider (Optional)
    geocoding_provider: str = os.getenv("GEOCODING_PROVIDER", "built-in")
    openrouteservice_api_key: str = os.getenv("OPENROUTESERVICE_API_KEY", "")

    @property
    def has_openrouteservice_key(self) -> bool:
        """Check if an external OpenRouteService API key is configured."""
        return bool(self.openrouteservice_api_key.strip())


settings = Settings()

