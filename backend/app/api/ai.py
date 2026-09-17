"""
AI Analytics API Routes
=======================
Exposes dedicated inference endpoints for Fault Classification, Anomaly Detection,
Remaining Useful Life (RUL) estimation, and diagnostic explanations.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas import (
    TelemetryInput,
    FaultPredictionResponse,
    AnomalyResponse,
    RULResponse,
    AIExplanationResponse
)
from backend.app.services.twin_service import service_manager

router = APIRouter(prefix="/ai", tags=["AI Analytics"])


@router.post(
    "/predict",
    response_model=FaultPredictionResponse,
    summary="Predict aero engine fault class from telemetry"
)
def predict_fault(telemetry: TelemetryInput) -> FaultPredictionResponse:
    """
    Evaluates 13-channel telemetry vector using the trained RandomForestClassifier.
    Returns predicted fault mode and posterior probability distribution.
    """
    try:
        pred_fault, probas = service_manager.predict_fault(telemetry.model_dump())
        return FaultPredictionResponse(
            predicted_fault=pred_fault,
            fault_probabilities=probas
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid telemetry vector: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fault inference failed: {str(e)}"
        )


@router.post(
    "/anomaly",
    response_model=AnomalyResponse,
    summary="Detect operational anomalies in telemetry"
)
def detect_anomaly(telemetry: TelemetryInput) -> AnomalyResponse:
    """
    Evaluates telemetry vector using the unsupervised IsolationForest anomaly detector.
    Returns anomaly status (NORMAL/ANOMALOUS) and normalized anomaly score [0.0, 1.0].
    """
    try:
        status_label, score = service_manager.detect_anomaly(telemetry.model_dump())
        return AnomalyResponse(
            anomaly_status=status_label,
            anomaly_score=score
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid telemetry vector: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly inference failed: {str(e)}"
        )


@router.post(
    "/rul",
    response_model=RULResponse,
    summary="Estimate Remaining Useful Life (RUL) in hours"
)
def predict_rul(telemetry: TelemetryInput) -> RULResponse:
    """
    Estimates remaining operating hours before maintenance threshold using RandomForestRegressor.
    Guarantees non-negative prediction output.
    """
    try:
        rul_hours = service_manager.predict_rul(telemetry.model_dump())
        return RULResponse(predicted_rul_hours=rul_hours)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid telemetry vector: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RUL regression failed: {str(e)}"
        )


@router.get(
    "/explanation",
    response_model=AIExplanationResponse,
    summary="Retrieve diagnostic AI explanation for current state"
)
def get_ai_explanation() -> AIExplanationResponse:
    """
    Returns human-interpretable diagnostic explanation summarizing current AI model
    predictions, anomaly scores, and key contributing sensor deviations.
    """
    twin_state = service_manager.get_digital_twin_state()
    if twin_state is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Digital Twin state. Start a simulation first via POST /api/simulation/start."
        )

    # Identify primary abnormal deviations
    important_deviations = []
    for param, dev in twin_state.deviations.items():
        dev_status = getattr(dev, "status", None) or (dev.get("status") if isinstance(dev, dict) else "NORMAL")
        if dev_status in ["WARNING", "CRITICAL"]:
            act = getattr(dev, "actual", 0.0) if hasattr(dev, "actual") else dev.get("actual", 0.0)
            exp = getattr(dev, "expected", 0.0) if hasattr(dev, "expected") else dev.get("expected", 0.0)
            unit = getattr(dev, "unit", "") if hasattr(dev, "unit") else dev.get("unit", "")
            important_deviations.append({
                "parameter": param,
                "actual": act,
                "expected": exp,
                "unit": unit,
                "status": dev_status
            })

    dominant_prob = float(twin_state.fault_probabilities.get(twin_state.predicted_fault, 0.0))

    # Formulate non-certain diagnostic explanation
    if twin_state.predicted_fault == "NORMAL" and twin_state.anomaly_status == "NORMAL":
        explanation = (
            f"Nominal operating conditions observed. Fault classifier predicts NORMAL operation "
            f"({dominant_prob * 100:.1f}% probability) with nominal anomaly score ({twin_state.anomaly_score:.2f}) "
            f"and estimated remaining useful life of {twin_state.predicted_rul_hours:.1f} hours."
        )
    else:
        issues = []
        if twin_state.predicted_fault != "NORMAL":
            issues.append(f"predicted fault '{twin_state.predicted_fault}' with probability {dominant_prob:.2f}")
        if twin_state.anomaly_status == "ANOMALOUS":
            issues.append(f"unsupervised anomaly score is elevated at {twin_state.anomaly_score:.2f}")
        if important_deviations:
            dev_str = ", ".join([f"{d['parameter']} ({d['status']})" for d in important_deviations])
            issues.append(f"elevated deviations in: {dev_str}")

        explanation = (
            f"Advisory diagnostic indication: {' and '.join(issues)}. "
            f"Predicted RUL is estimated at {twin_state.predicted_rul_hours:.1f} hours. "
            f"Telemetry patterns indicate potential degradation requiring engineering review."
        )

    return AIExplanationResponse(
        predicted_fault=twin_state.predicted_fault,
        fault_probability=round(dominant_prob, 4),
        anomaly_status=twin_state.anomaly_status,
        anomaly_score=twin_state.anomaly_score,
        predicted_rul_hours=twin_state.predicted_rul_hours,
        important_deviations=important_deviations,
        explanation=explanation
    )
