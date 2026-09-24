"""
Mission Risk & Reliability API Routes
======================================
Exposes endpoints evaluating mission reliability, operational risk levels,
and actionable dispatch recommendations.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas import MissionRiskResponse, WhatIfRequest, WhatIfResponse
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
    throttle: Optional[float] = Query(None, ge=0.0, le=100.0, description="Planned throttle position in %"),
    uav_id: Optional[str] = Query("UAV-001", description="Target UAV identifier")
) -> MissionRiskResponse:
    """
    Evaluates mission reliability score, risk category (LOW/MEDIUM/HIGH), and
    decision-support recommendation based on the current Digital Twin state and
    optional what-if mission parameters.
    """
    target_id = str(uav_id or "UAV-001").strip().upper()
    decision = service_manager.get_mission_decision(
        duration_hours=mission_duration_hours,
        altitude=altitude,
        ambient_temp=ambient_temperature,
        throttle=throttle,
        uav_id=target_id
    )

    if decision is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active Digital Twin state available for {target_id}. Start a simulation first via POST /api/simulation/start."
        )

    return MissionRiskResponse(**decision.to_dict())


@router.post(
    "/what-if",
    response_model=WhatIfResponse,
    summary="Evaluate What-If scenario using physics simulation, Digital Twin, and AI"
)
def evaluate_what_if_scenario(request: WhatIfRequest) -> WhatIfResponse:
    """
    Evaluates a What-If flight scenario without modifying any live UAV telemetry,
    fleet state, or RTB status. Uses isolated simulation physics and Digital Twin models.
    """
    result = service_manager.evaluate_what_if(request)
    return WhatIfResponse(**result)
