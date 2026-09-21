"""
AeroTwin-UAV API Router Aggregation
===================================
Combines individual route modules into a single unified API router.
"""

from fastapi import APIRouter

from backend.app.api.health import router as health_router
from backend.app.api.simulation import router as simulation_router
from backend.app.api.digital_twin import router as digital_twin_router
from backend.app.api.ai import router as ai_router
from backend.app.api.mission import router as mission_router
from backend.app.api.uav import router as uav_router
from backend.app.api.rtb import router as rtb_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(simulation_router)
api_router.include_router(digital_twin_router)
api_router.include_router(ai_router)
api_router.include_router(mission_router)
api_router.include_router(uav_router)
api_router.include_router(rtb_router)

__all__ = ["api_router"]
