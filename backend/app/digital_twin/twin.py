"""
AeroTwin-UAV Core Digital Twin Pipeline & State Model
=====================================================
Integrates physics baseline expectations, telemetry deviations, and trained
AI models (Fault Classifier, Anomaly Detector, and RUL Regressor) into a unified
real-time Digital Twin state.

Software-only research prototype.
"""

from dataclasses import dataclass, asdict, field
from typing import Dict, Any, Optional, List, Union
import os
import json
import numpy as np
import pandas as pd
import joblib

from backend.app.digital_twin.baseline import PhysicsBaselineModel
from backend.app.digital_twin.deviation import ParameterDeviation, DeviationAnalyzer
from backend.app.digital_twin.health import HealthAssessment, HealthWeights


class DigitalTwinModelLoadError(RuntimeError):
    """Raised when an AI model artifact is missing or corrupted."""
    pass


@dataclass
class DigitalTwinState:
    """
    Structured snapshot of the Digital Twin state for a virtual aero piston engine.
    """
    timestamp: str
    engine_id: str
    mission_id: str
    flight_phase: str

    actual_telemetry: Dict[str, float]
    expected_telemetry: Dict[str, float]
    deviations: Dict[str, Any]

    engine_health: float
    engine_fitness_score: float

    predicted_fault: str
    fault_probabilities: Dict[str, float]

    anomaly_status: str
    anomaly_score: float

    predicted_rul_hours: float
    overall_status: str

    def to_dict(self) -> Dict[str, Any]:
        """Serializes DigitalTwinState to a standard JSON-compatible dictionary."""
        d = asdict(self)
        # Ensure deviation items are plain dictionaries
        if isinstance(self.deviations, dict):
            d["deviations"] = {
                k: (v.to_dict() if hasattr(v, "to_dict") else v)
                for k, v in self.deviations.items()
            }
        return d


class DigitalTwin:
    """
    Digital Twin tracking system for virtual aero piston engines.
    """

    FEATURE_NAMES = [
        "rpm",
        "throttle",
        "altitude",
        "ambient_temperature",
        "humidity",
        "wind_speed",
        "cht",
        "egt",
        "oil_pressure",
        "oil_temperature",
        "vibration",
        "fuel_flow",
        "engine_load"
    ]

    def __init__(
        self,
        models_dir: Optional[str] = None,
        health_weights: Optional[HealthWeights] = None
    ):
        if models_dir is None:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
            models_dir = os.path.join(base_dir, "models")
        self.models_dir = models_dir

        self.health_assessment = HealthAssessment(health_weights)

        # 1. Load Trained Machine Learning Artifacts
        self.fault_model = self._load_artifact("fault_classifier.joblib")
        self.anomaly_model = self._load_artifact("anomaly_detector.joblib")
        self.rul_model = self._load_artifact("rul_model.joblib")

        # 2. Load Anomaly Detector normalization bounds from metadata
        self.df_min, self.df_max = self._load_anomaly_metadata()

    def _load_artifact(self, filename: str) -> Any:
        """Safely loads a joblib model artifact or raises a clear structured error."""
        path = os.path.join(self.models_dir, filename)
        if not os.path.exists(path):
            raise DigitalTwinModelLoadError(
                f"Required AI model artifact missing at '{path}'. "
                f"Ensure model training steps (Steps 5, 6, 7) have completed."
            )
        try:
            return joblib.load(path)
        except Exception as e:
            raise DigitalTwinModelLoadError(f"Failed to unpickle model artifact '{path}': {e}") from e

    def _load_anomaly_metadata(self) -> tuple[float, float]:
        """Loads normalization bounds from anomaly detector metadata."""
        meta_path = os.path.join(self.models_dir, "anomaly_detector_metadata.json")
        default_min, default_max = -0.1352, 0.1004
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                scoring = meta.get("anomaly_scoring", {})
                return float(scoring.get("df_min", default_min)), float(scoring.get("df_max", default_max))
            except Exception:
                pass
        return default_min, default_max

    def _extract_telemetry_dict(self, telemetry: Union[Dict[str, Any], Any]) -> Dict[str, Any]:
        """Normalizes input from dataclass/object or dictionary to standard dict."""
        if hasattr(telemetry, "to_dict"):
            return telemetry.to_dict()
        elif isinstance(telemetry, dict):
            return dict(telemetry)
        elif hasattr(telemetry, "__dict__"):
            return dict(telemetry.__dict__)
        else:
            raise TypeError(f"Unsupported telemetry input type: {type(telemetry)}")

    def update(self, telemetry: Union[Dict[str, Any], Any]) -> DigitalTwinState:
        """
        Executes the continuous Digital Twin estimation cycle:
        1. Parse actual telemetry
        2. Compute physics-inspired expected values
        3. Calculate multi-dimensional deviations
        4. Run AI model inference (Fault, Anomaly, RUL)
        5. Evaluate Engine Health
        6. Evaluate Engine Fitness
        7. Determine Overall Status
        8. Return comprehensive DigitalTwinState
        """
        raw = self._extract_telemetry_dict(telemetry)

        # Ensure default metadata fields
        engine_id = str(raw.get("engine_id", "AERO-001"))
        mission_id = str(raw.get("mission_id", "MSN-001"))
        flight_phase = str(raw.get("flight_phase", "CRUISE"))
        timestamp = str(raw.get("timestamp", ""))

        # 1. Extract and sanitize the 13 input features for AI models
        features_dict = {}
        for f in self.FEATURE_NAMES:
            if f not in raw:
                raise ValueError(f"Missing required telemetry channel '{f}' in Digital Twin update.")
            val = float(raw[f])
            if np.isnan(val) or np.isinf(val):
                raise ValueError(f"Telemetry channel '{f}' has invalid non-finite value: {val}")

            # AI models were trained on synthetic dataset where throttle and engine_load are in [0.0, 1.0]
            if f in ["throttle", "engine_load"] and val > 1.0:
                features_dict[f] = val / 100.0
            else:
                features_dict[f] = val

        # Prepare DataFrame input with feature names to prevent Scikit-Learn warnings
        X_input = pd.DataFrame([features_dict])[self.FEATURE_NAMES]

        # 2. Compute Expected Telemetry Baseline
        expected_telemetry = PhysicsBaselineModel.calculate_expected(raw)

        # 3. Compute Deviations for All Primary Parameters
        deviations = DeviationAnalyzer.compute_deviations(raw, expected_telemetry)

        # 4. AI Inference
        # 4A. Fault Classifier
        pred_fault = str(self.fault_model.predict(X_input)[0])
        fault_proba_raw = self.fault_model.predict_proba(X_input)[0]
        classes = self.fault_model.classes_
        fault_probabilities = {
            cls_name: round(float(prob), 4)
            for cls_name, prob in zip(classes, fault_proba_raw)
        }

        # 4B. Anomaly Detector
        raw_df = float(self.anomaly_model.decision_function(X_input)[0])
        raw_pred = int(self.anomaly_model.predict(X_input)[0])  # +1 = normal, -1 = anomaly
        anomaly_status = "NORMAL" if raw_pred == 1 else "ANOMALOUS"

        # Normalized anomaly score in [0.0, 1.0] (0 = fully normal, 1 = severe anomaly)
        norm_score = (self.df_max - raw_df) / max(1e-5, (self.df_max - self.df_min))
        anomaly_score = float(np.clip(norm_score, 0.0, 1.0))

        # 4C. RUL Regressor
        raw_rul = float(self.rul_model.predict(X_input)[0])
        predicted_rul_hours = float(np.clip(raw_rul, 0.0, None))

        # 5. Evaluate Engine Health Score (0 - 100)
        degradation = raw.get("degradation", None)
        if degradation is not None:
            degradation = float(degradation)
        engine_health = self.health_assessment.compute_engine_health(deviations, degradation)

        # 6. Evaluate Engine Fitness Score (0 - 100)
        fault_severity = float(raw.get("fault_severity", 0.0))
        engine_fitness_score = self.health_assessment.compute_engine_fitness(
            deviations=deviations,
            health_score=engine_health,
            anomaly_score=anomaly_score,
            fault_severity=fault_severity
        )

        # 7. Determine Overall Engine Status
        overall_status = self.health_assessment.determine_overall_status(
            health_score=engine_health,
            fitness_score=engine_fitness_score,
            anomaly_status=anomaly_status,
            predicted_fault=pred_fault,
            deviations=deviations
        )

        # 8. Assemble DigitalTwinState
        actual_subset = {k: round(float(raw[k]), 2) for k in self.FEATURE_NAMES if k in raw}

        return DigitalTwinState(
            timestamp=timestamp,
            engine_id=engine_id,
            mission_id=mission_id,
            flight_phase=flight_phase,
            actual_telemetry=actual_subset,
            expected_telemetry=expected_telemetry,
            deviations=deviations,
            engine_health=engine_health,
            engine_fitness_score=engine_fitness_score,
            predicted_fault=pred_fault,
            fault_probabilities=fault_probabilities,
            anomaly_status=anomaly_status,
            anomaly_score=round(anomaly_score, 4),
            predicted_rul_hours=round(predicted_rul_hours, 1),
            overall_status=overall_status
        )
