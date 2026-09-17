"""
Digital Twin API Routes
=======================
Exposes state tracking, multi-parameter deviations, and composite health scores.
"""

from fastapi import APIRouter, HTTPException, status
from backend.app.schemas import (
    DigitalTwinResponse,
    DigitalTwinHealthResponse,
    DigitalTwinDeviationResponse,
    ParameterDeviationDetail
)
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin"])


def _require_twin_state():
    state = service_manager.get_digital_twin_state()
    if state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Digital Twin state available. Start a simulation first via POST /api/simulation/start."
        )
    return state


@router.get(
    "/status",
    response_model=DigitalTwinResponse,
    summary="Retrieve full Digital Twin state"
)
def get_digital_twin_status() -> DigitalTwinResponse:
    """Returns the synchronized Digital Twin state including deviations and AI predictions."""
    twin_state = _require_twin_state()
    return DigitalTwinResponse(**twin_state.to_dict())


@router.get(
    "/health",
    response_model=DigitalTwinHealthResponse,
    summary="Retrieve Engine Health and Fitness scores"
)
def get_digital_twin_health() -> DigitalTwinHealthResponse:
    """Returns composite Engine Health (0-100), Fitness Score (0-100), and overall status."""
    twin_state = _require_twin_state()
    return DigitalTwinHealthResponse(
        engine_health=twin_state.engine_health,
        engine_fitness_score=twin_state.engine_fitness_score,
        overall_status=twin_state.overall_status,
        timestamp=twin_state.timestamp
    )


@router.get(
    "/deviation",
    response_model=DigitalTwinDeviationResponse,
    summary="Retrieve parameter baseline deviations"
)
def get_digital_twin_deviations() -> DigitalTwinDeviationResponse:
    """Returns expected vs actual telemetry channels and their calculated deviations."""
    twin_state = _require_twin_state()
    dev_dict = {}
    for k, v in twin_state.deviations.items():
        if hasattr(v, "to_dict"):
            dev_dict[k] = ParameterDeviationDetail(**v.to_dict())
        elif isinstance(v, dict):
            dev_dict[k] = ParameterDeviationDetail(**v)

    return DigitalTwinDeviationResponse(
        expected_telemetry=twin_state.expected_telemetry,
        actual_telemetry=twin_state.actual_telemetry,
        deviations=dev_dict
    )
