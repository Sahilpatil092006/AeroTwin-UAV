"""
Health Check API Route
======================
Provides system health monitoring endpoint.
"""

from fastapi import APIRouter
from backend.app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Returns application health status and service version."""
    return HealthResponse(
        status="ok",
        service="AeroTwin-UAV API",
        version="1.0.0"
    )
