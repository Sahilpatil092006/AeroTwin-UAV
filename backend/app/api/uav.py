"""
UAV State API Routes
====================
Exposes endpoints for querying unified UAV state representations,
per-UAV telemetry and AI health metrics, and active fleet UAV identifiers.

Software-only research prototype.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.uav import UAVStateResponse, FleetStateResponse
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/uav", tags=["UAV"])


@router.get(
    "/all",
    response_model=FleetStateResponse,
    summary="Retrieve current simulated states of ALL UAVs in the fleet"
)
def get_all_uav_states() -> FleetStateResponse:
    """
    Returns the current synchronized simulated telemetry and Digital Twin states
    for all 5 UAVs in the fleet (UAV-001 through UAV-005).
    Data is explicitly marked as simulated telemetry.
    """
    states = service_manager.get_all_uav_states()
    uav_responses = [UAVStateResponse(**st.to_dict()) for st in states.values()]
    first_ts = uav_responses[0].timestamp if uav_responses else None

    return FleetStateResponse(
        total_uavs=len(uav_responses),
        data_mode="SIMULATED",
        timestamp=first_ts,
        uavs=uav_responses
    )


@router.get(
    "/states",
    response_model=FleetStateResponse,
    include_in_schema=False
)
def get_all_uav_states_alias() -> FleetStateResponse:
    """Alias for /all endpoint."""
    return get_all_uav_states()


@router.get(
    "/state",
    response_model=UAVStateResponse,
    summary="Retrieve unified UAV state"
)
def get_uav_state(
    uav_id: str = Query("UAV-001", description="Unique UAV identifier")
) -> UAVStateResponse:
    """
    Returns the clean unified UAV state containing:
    uav_id, mission_id, engine telemetry, flight phase, engine health,
    fitness score, predicted fault, fault confidence, anomaly status,
    anomaly score, predicted RUL, mission risk, and recommendation.
    """
    state = service_manager.get_uav_state(uav_id=uav_id)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active state found for UAV '{uav_id}'."
        )

    return UAVStateResponse(**state.to_dict())


@router.get(
    "/{uav_id}/state",
    response_model=UAVStateResponse,
    summary="Retrieve unified state for a specific UAV"
)
def get_uav_state_by_path(uav_id: str) -> UAVStateResponse:
    """Path-parameter variant for retrieving a specific UAV state."""
    return get_uav_state(uav_id=uav_id)


@router.get(
    "/list",
    summary="List active UAV identifiers"
)
def list_uavs() -> Dict[str, List[str]]:
    """Returns all UAV identifiers currently tracked by the Twin Service."""
    return {
        "uav_ids": service_manager.list_uav_ids()
    }
