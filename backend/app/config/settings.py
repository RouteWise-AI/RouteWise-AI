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
load_dotenv(ROOT_DIR / "backend" / ".env")


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
        "BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
    )

    # MCP Server
    mcp_server_host: str = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
    mcp_server_port: int = int(os.getenv("MCP_SERVER_PORT", "8000"))
    mcp_server_path: str = os.getenv("MCP_SERVER_PATH", "/mcp")
    mcp_server_url: str = os.getenv("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")

    # Backend
    backend_host: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port: int = int(os.getenv("BACKEND_PORT", "8001"))
    cors_origins: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()

