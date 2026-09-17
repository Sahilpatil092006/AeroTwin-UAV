"""
Mission Risk & Reliability API Routes
======================================
Exposes endpoints evaluating mission reliability, operational risk levels,
and actionable dispatch recommendations.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas import MissionRiskResponse
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/mission", tags=["Mission Risk"])


@router.get(
    "/risk",
    response_model=MissionRiskResponse,
    summary="Evaluate current or what-if mission risk and reliability"
)
def get_mission_risk(
    mission_duration_hours: Optional[float] = Query(None, gt=0.0, le=48.0, description="Planned mission duration in hours"),
    altitude: Optional[float] = Query(None, ge=0.0, le=8500.0, description="Planned altitude in meters"),
    ambient_temperature: Optional[float] = Query(None, ge=-40.0, le=60.0, description="Ambient temperature in °C"),
    throttle: Optional[float] = Query(None, ge=0.0, le=100.0, description="Planned throttle position in %")
) -> MissionRiskResponse:
    """
    Evaluates mission reliability score, risk category (LOW/MEDIUM/HIGH), and
    decision-support recommendation based on the current Digital Twin state and
    optional what-if mission parameters.
    """
    decision = service_manager.get_mission_decision(
        duration_hours=mission_duration_hours,
        altitude=altitude,
        ambient_temp=ambient_temperature,
        throttle=throttle
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Digital Twin state available. Start a simulation first via POST /api/simulation/start."
        )

    return MissionRiskResponse(**decision.to_dict())
