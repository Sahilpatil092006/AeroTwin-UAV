"""
AeroTwin-UAV Digital Twin Package
=================================
Virtual aero piston engine digital twin state estimator, physics baseline tracking,
multi-sensor deviation analysis, and AI model fusion.

Software-only research prototype.
"""

from backend.app.digital_twin.baseline import (
    OperatingBounds,
    OPERATING_BOUNDS,
    PhysicsBaselineModel
)
from backend.app.digital_twin.deviation import (
    ParameterDeviation,
    DeviationAnalyzer
)
from backend.app.digital_twin.health import (
    HealthWeights,
    HealthAssessment
)
from backend.app.digital_twin.twin import (
    DigitalTwin,
    DigitalTwinState,
    DigitalTwinModelLoadError
)

__all__ = [
    "OperatingBounds",
    "OPERATING_BOUNDS",
    "PhysicsBaselineModel",
    "ParameterDeviation",
    "DeviationAnalyzer",
    "HealthWeights",
    "HealthAssessment",
    "DigitalTwin",
    "DigitalTwinState",
    "DigitalTwinModelLoadError"
]
