"""FastAPI application entry point for 快查 AI backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.ws import ws_router
from app.agents.registry import register_all_agents
from app.config import settings
from app.db.database import initialize_database
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan – runs startup and shutdown logic."""
    logger.info("Starting %s ...", settings.APP_NAME)
    logger.info(
        "Driver: %s | Model: %s | Mock data: %s",
        settings.AGENT_DRIVER,
        settings.CLAUDE_MODEL,
        settings.USE_MOCK_DATA,
    )

    # Initialize SQLite database for batch data processing
    initialize_database()

    # Register all agent workflows
    register_all_agents()

    yield  # Application is running

    logger.info("Shutting down %s ...", settings.APP_NAME)


app = FastAPI(
    title=settings.APP_NAME,
    description="快查 AI - 企业风控智能助手后端服务",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix="/api")
app.include_router(ws_router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Simple health check endpoint."""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "driver": settings.AGENT_DRIVER,
        "model": settings.CLAUDE_MODEL,
        "mock_data": settings.USE_MOCK_DATA,
    }
