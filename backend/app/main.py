"""
RouteWise AI - FastAPI Application Entrypoint
Main server connecting the web application to the AI decision agent and MCP client.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .config.settings import settings
from .mcp_client.client import default_mcp_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("routewise.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RouteWise AI Backend...")
    logger.info(f"AI Provider Mode: {settings.ai_provider}")
    logger.info(f"Target MCP Server: {settings.mcp_server_url}")

    # Non-blocking probe of MCP server
    health = await default_mcp_client.check_health()
    if health.get("status") == "healthy":
        logger.info("Successfully connected to RouteWise MCP Server.")
    else:
        logger.warning(
            f"MCP Server not detected at {settings.mcp_server_url}. "
            "Start the MCP server with: python mcp_server/server.py"
        )
    yield
    logger.info("Shutting down RouteWise AI Backend.")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-Powered Travel & Logistics Decision Agent Backend",
    lifespan=lifespan,
)

# CORS configuration - dynamically permits Vercel domains, configured CORS_ORIGINS, and local dev
cors_env = (settings.cors_origins or "").strip()
if cors_env and cors_env != "*":
    explicit_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=explicit_origins,
        allow_origin_regex=r"^https://.*\.vercel\.app$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount API routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "tagline": settings.tagline,
        "version": settings.app_version,
        "documentation": "/docs",
        "health": "/health",
        "api_health": "/api/health",
    }


@app.get("/health")
async def health():
    """Direct root health endpoint for Render and external uptime monitoring."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )

