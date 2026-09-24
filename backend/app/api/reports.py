"""
Reports API Routes
==================
Exposes persistent SQLite flight history and session summary metrics for each UAV.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.db.flight_history import flight_history_db
from backend.app.services.twin_service import service_manager, FLEET_UAV_IDS

router = APIRouter(prefix="/reports", tags=["Reports & History"])


class TelemetrySampleRecord(BaseModel):
    id: int
    sortie_id: str
    uav_id: str
    timestamp: str
    flight_phase: str
    rpm: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temperature: float
    vibration: float
    fuel_flow: float
    throttle: float
    engine_load: float
    health_score: Optional[float] = None
    mission_risk: Optional[str] = None


class FlightSessionRecord(BaseModel):
    sortie_id: str
    uav_id: str
    start_time: str
    end_time: Optional[str] = None
    flight_phase: str
    status: str
    peak_cht: float
    peak_egt: float
    min_oil_pressure: float
    health_score: float
    mission_risk: str
    total_samples: int
    updated_at: Optional[str] = None


class UAVFlightHistoryResponse(BaseModel):
    uav_id: str
    total_samples: int
    sessions: List[FlightSessionRecord] = Field(default_factory=list)
    samples: List[TelemetrySampleRecord]


class UAVFlightSummaryResponse(BaseModel):
    uav_id: str
    sortie_id: str
    status: str
    flight_phase: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    total_samples: int
    peak_cht: float
    peak_egt: float
    min_oil_pressure: float
    health_score: float
    mission_risk: str
    updated_at: Optional[str] = None
    latest_telemetry: Dict[str, Any] = Field(default_factory=dict)


@router.get(
    "/{uav_id}/history",
    response_model=UAVFlightHistoryResponse,
    summary="Get persisted telemetry history for a specific UAV"
)
def get_uav_history(
    uav_id: str,
    limit: int = Query(default=100, ge=1, le=1000)
) -> UAVFlightHistoryResponse:
    """
    Retrieves chronologically sorted historical telemetry samples persisted in SQLite
    for the requested UAV.
    """
    clean_id = str(uav_id).strip().upper()
    if clean_id not in FLEET_UAV_IDS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"UAV identifier '{uav_id}' not found. Supported fleet UAVs: {', '.join(FLEET_UAV_IDS)}"
        )

    # Ensure simulation state is running and has recorded at least one sample
    service_manager.ensure_simulation(uav_id=clean_id)

    sessions = flight_history_db.get_sessions(clean_id)
    history = flight_history_db.get_history(clean_id, limit=limit)
    return UAVFlightHistoryResponse(
        uav_id=clean_id,
        total_samples=len(history),
        sessions=sessions,
        samples=history
    )


@router.get(
    "/{uav_id}/summary",
    response_model=UAVFlightSummaryResponse,
    summary="Get sortie session summary for a specific UAV"
)
def get_uav_summary(uav_id: str) -> UAVFlightSummaryResponse:
    """
    Retrieves aggregate flight session metrics (peak CHT/EGT, min oil pressure,
    health score, risk) for the requested UAV from SQLite.
    """
    clean_id = str(uav_id).strip().upper()
    if clean_id not in FLEET_UAV_IDS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"UAV identifier '{uav_id}' not found. Supported fleet UAVs: {', '.join(FLEET_UAV_IDS)}"
        )

    service_manager.ensure_simulation(uav_id=clean_id)

    summary = flight_history_db.get_summary(clean_id)
    return UAVFlightSummaryResponse(**summary)
