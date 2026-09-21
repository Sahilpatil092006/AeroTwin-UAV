"""
AeroTwin-UAV Emergency Return-to-Base (RTB) Schema Models
========================================================
Defines the request and response data structures for the RTB Decision Engine API.

Software-only research prototype.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class RtbStatusResponse(BaseModel):
    """
    Structured response payload representing the Emergency Return-to-Base (RTB)
    operational decision for a specific UAV asset.
    """
    rtb_active: bool = Field(
        ...,
        description="True if Emergency Return-to-Base is currently activated, False otherwise"
    )
    uav_id: str = Field(
        ...,
        description="Unique identifier of the evaluated UAV asset"
    )
    trigger_reason: Optional[str] = Field(
        default=None,
        description="Detailed explanation of the condition(s) triggering RTB, or None if in STANDBY"
    )
    severity: str = Field(
        ...,
        description="Operational severity: 'NONE' when nominal, 'CRITICAL' when RTB active"
    )
    destination: str = Field(
        default="HOME_BASE",
        description="Target landing recovery airfield"
    )
    status: str = Field(
        ...,
        description="Operational status string: 'STANDBY' or 'EMERGENCY RTB'"
    )
    triggering_telemetry_values: Dict[str, Any] = Field(
        default_factory=dict,
        description="Snapshot of telemetry and diagnostic parameters evaluated against RTB thresholds"
    )
    timestamp: Optional[str] = Field(
        default=None,
        description="ISO-8601 UTC timestamp of evaluation"
    )
