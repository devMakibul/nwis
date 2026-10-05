"""
eRTMAC-NWIS — Nearby Wells Intelligence System
FastAPI Application Entry Point
"""
import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.api import api_router
from app.api.routes.live import ws_router
from app.database.init_db import init_db

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialize DB on startup."""
    logger.info("nwis_startup", version="0.9", environment="development")
    try:
        await init_db()
        logger.info("nwis_ready")
    except Exception as e:
        logger.error("startup_failed", error=str(e))
        raise
    yield
    logger.info("nwis_shutdown")


app = FastAPI(
    title="eRTMAC-NWIS",
    description="Nearby Wells Intelligence System — AI-powered drilling decision support for Oil India Limited",
    version="0.9.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes
app.include_router(api_router)
app.include_router(ws_router)  # WebSocket telemetry (bare path: /ws/...)


@app.get("/", tags=["Health"])
async def root():
    return {
        "system": "eRTMAC-NWIS",
        "description": "Nearby Wells Intelligence System",
        "version": "0.9.0",
        "status": "operational",
        "docs": "/api/docs",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "eRTMAC-NWIS Backend"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error", "detail": str(exc)},
    )
