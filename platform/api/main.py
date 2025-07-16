from fastapi import FastAPI, Depends, HTTPException, status, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import logging
from typing import Optional

from core.config import settings
from core.database import engine, Base
from core.celery_app import celery_app
from api.routes import workshops, attendees, deployments, auth, health, internal
from api.websocket import websocket_endpoint, manager
from core.logging import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting TechLabs Automation API")
    yield
    # Shutdown
    logger.info("Shutting down TechLabs Automation API")

# Create FastAPI app
app = FastAPI(
    title="TechLabs Automation API",
    description="API for managing workshop environments and OVHcloud resources",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(workshops.router, prefix="/api/workshops", tags=["workshops"])
app.include_router(attendees.router, prefix="/api/attendees", tags=["attendees"])
app.include_router(deployments.router, prefix="/api/deployments", tags=["deployments"])
app.include_router(internal.router, prefix="/internal", tags=["internal"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "TechLabs Automation API",
        "version": "1.0.0",
        "status": "running"
    }

# WebSocket endpoint
@app.websocket("/ws/{workshop_id}")
async def websocket_route(websocket: WebSocket, workshop_id: str, token: str = None):
    await websocket_endpoint(websocket, workshop_id, token)

# Make celery available for tasks
celery = celery_app

# Export manager for use in other modules
websocket_manager = manager

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.DEBUG else False,
        log_level="info"
    )