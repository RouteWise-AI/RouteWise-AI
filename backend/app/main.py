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

# CORS configuration
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
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=True,
    )

