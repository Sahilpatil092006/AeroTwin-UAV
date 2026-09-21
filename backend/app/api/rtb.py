"""
AeroTwin-UAV Emergency Return-to-Base (RTB) API Routes
======================================================
Provides REST endpoints for querying autonomous Return-to-Base decisions,
threshold triggers, and emergency flight recovery orders.

Software-only research prototype.
"""

from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.rtb import RtbStatusResponse
from backend.app.decision.rtb import RtbDecisionEngine
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/rtb", tags=["RTB"])


@router.get(
    "/status",
    response_model=RtbStatusResponse,
    summary="Get Emergency Return-to-Base (RTB) status for a UAV"
)
def get_rtb_status(
    uav_id: str = Query("UAV-001", description="Unique UAV identifier (e.g. UAV-001, UAV-002)")
) -> RtbStatusResponse:
    """
    Evaluates current UAV telemetry, health diagnostics, AI fault classification,
    and mission risk against the 5 critical Emergency Return-to-Base (RTB) conditions:
    1. Engine Health < 30%
    2. Oil Pressure < 1.0 bar
    3. CHT > 145°C
    4. Vibration > 6g
    5. Mission Risk = HIGH AND a critical fault is present

    Returns:
    - rtb_active (boolean)
    - uav_id (string)
    - trigger_reason (string or None)
    - severity ('NONE' or 'CRITICAL')
    - destination ('HOME_BASE')
    - status ('STANDBY' or 'EMERGENCY RTB')
    - triggering_telemetry_values (dict of snapshot metrics)
    """
    clean_id = (uav_id or "UAV-001").strip().upper()
    state = service_manager.get_uav_state(uav_id=clean_id)
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"UAV '{clean_id}' not found in active fleet."
        )

    decision = RtbDecisionEngine.evaluate_uav_state(state)
    return RtbStatusResponse(**decision)
