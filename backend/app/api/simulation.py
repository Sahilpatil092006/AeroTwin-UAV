"""
Simulation Control API Routes
==============================
Exposes endpoints to initialize and query the virtual aero piston engine simulator.
"""

import asyncio
from typing import Union
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas import (
    SimulationStartRequest,
    SimulationFaultRequest,
    TelemetryResponse,
    StandbyResponse
)
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post(
    "/start",
    response_model=TelemetryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize and start virtual engine simulation"
)
async def start_simulation(request: SimulationStartRequest) -> TelemetryResponse:
    """
    Initializes a new virtual aero engine simulation session with configurable
    operating conditions, environmental parameters, and fault injections.
    Returns the initial generated telemetry state.
    """
    try:
        state = await asyncio.to_thread(service_manager.start_simulation, request)
        return TelemetryResponse(**state.to_dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid simulation parameter: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start simulation session: {str(e)}"
        )


@router.post(
    "/fault",
    response_model=TelemetryResponse,
    status_code=status.HTTP_200_OK,
    summary="Inject or clear operational fault for a UAV simulation"
)
async def inject_fault(request: SimulationFaultRequest) -> TelemetryResponse:
    """
    Injects an operational failure mode or clears active faults for a given UAV.
    Returns the immediate post-injection telemetry state.
    """
    try:
        state = await asyncio.to_thread(
            service_manager.inject_fault,
            fault_type=request.fault_type,
            severity=request.severity,
            uav_id=request.uav_id,
            degradation=request.degradation,
            target_sensor=request.target_sensor
        )
        return TelemetryResponse(**state.to_dict())
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid fault parameter: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inject fault: {str(e)}"
        )


@router.get(
    "/current",
    response_model=Union[TelemetryResponse, StandbyResponse],
    summary="Retrieve current simulation telemetry"
)
def get_current_simulation():
    """
    Retrieves the current telemetry snapshot from the active engine simulation.
    If no simulation has been initialized, returns a standby notification.
    """
    state = service_manager.get_current_simulation()
    if state is None:
        return StandbyResponse(
            status="standby",
            message="No active simulation."
        )
    return TelemetryResponse(**state.to_dict())
