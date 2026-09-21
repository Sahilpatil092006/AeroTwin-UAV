"""
AeroTwin-UAV Real-Time WebSocket Telemetry Endpoint
===================================================
Streams real-time virtual aero engine simulation telemetry, Digital Twin
evaluations, AI model inferences, and mission risk assessments.

Pipeline:
Virtual Engine Simulator
        ↓
Telemetry Generation
        ↓
Digital Twin
        ↓
AI Inference
        ↓
Mission Risk
        ↓
WebSocket
        ↓
React-ready real-time JSON stream

Software-only research prototype.
"""

import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.services.twin_service import service_manager

logger = logging.getLogger("aerotwin.websocket")
router = APIRouter()


@router.websocket("/ws/telemetry")
async def websocket_telemetry_stream(websocket: WebSocket):
    """
    Real-time WebSocket telemetry stream.
    Continuously advances the engine simulation, performs Digital Twin
    deviation and health analysis, runs AI inference, calculates Mission Risk,
    and streams structured JSON packets to the connected client.
    """
    await websocket.accept()
    logger.info("Client connected to /ws/telemetry stream.")

    # 1. Send initial connection status
    try:
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "AeroTwin-UAV telemetry stream started"
        })
    except Exception as err:
        logger.error("Failed to send initial connection message: %s", err)
        return

    # 2. Continuous real-time streaming loop
    try:
        while True:
            # Advance simulation asynchronously in thread pool to prevent blocking event loop
            target_uav = service_manager.active_manual_uav_id or service_manager.default_uav_id
            packet = await asyncio.to_thread(service_manager.step_simulation, 1.0, target_uav)

            # Transmit structured telemetry and analysis packet
            await websocket.send_json(packet)

            # 1 Hz discrete simulation step throttle
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        logger.info("Telemetry WebSocket disconnected.")
    except asyncio.CancelledError:
        logger.info("Telemetry WebSocket task cancelled.")
    except Exception as exc:
        logger.error("Error in telemetry streaming pipeline: %s", str(exc), exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": "An internal error occurred in the telemetry pipeline."
            })
        except Exception:
            pass
        logger.info("Telemetry WebSocket disconnected.")
