# AeroTwin-UAV FastAPI Backend API Documentation

**Project:** AeroTwin-UAV (Software-Only Research Prototype)  
**Component:** Backend REST Application (`backend/app`)  
**Version:** 1.0.0  
**Framework:** FastAPI + Uvicorn + Pydantic v2  

---

## 1. Overview & Architecture

The AeroTwin-UAV backend provides high-performance REST APIs allowing clients (such as aerospace ground control stations, engineering consoles, and the React frontend) to interface with:
1. **Physics-Inspired Engine Simulator (`AeroPistonEngineSimulator`)**
2. **Real-Time Digital Twin State Evaluator (`DigitalTwin`)**
3. **AI Inference Models (`Fault Classifier`, `Isolation Forest Anomaly Detector`, `RUL Regressor`)**
4. **Mission Risk & Reliability Decision Engine (`MissionDecisionEngine`)**

### Layered Architecture

```
HTTP Clients (React Frontend / Console / Curl / Tests)
               │
               ▼
┌───────────────────────────────────────────────┐
│              FastAPI Application              │
│      (CORS, Error Handlers, OpenAPI/Swagger)  │
└──────────────────────┬────────────────────────┘
                       │
               ▼ Route Dispatch
┌───────────────────────────────────────────────┐
│                  REST APIs                    │
│   ├── /api/health                             │
│   ├── /api/simulation                         │
│   ├── /api/digital-twin                       │
│   ├── /api/ai                                 │
│   └── /api/mission                            │
└──────────────────────┬────────────────────────┘
                       │
               ▼ Service Layer
┌───────────────────────────────────────────────┐
│        TwinServiceManager (Singleton)         │
│   (Orchestrates simulator, twin & models)     │
└──────┬───────────────┬───────────────┬────────┘
       │               │               │
       ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Simulator   │ │ Digital Twin │ │ Mission Risk │
│  (Step 8)    │ │ (Step 9)     │ │ Engine (10)  │
└──────────────┘ └──────┬───────┘ └──────────────┘
                        │
                        ▼
               ┌─────────────────┐
               │    AI Models    │
               │ (Steps 5, 6, 7) │
               └─────────────────┘
```

> **Thin Controller Rule:** API endpoint handlers never duplicate physics or mathematical logic. They perform strict request schema validation, delegate execution to the service/engine modules, and transform results into typed Pydantic responses.

---

## 2. Configuration & CORS

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `BACKEND_HOST` | `0.0.0.0` | Host interface for Uvicorn |
| `BACKEND_PORT` | `8000` | Port for Uvicorn |
| `FRONTEND_ORIGIN` | `http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173` | Allowed CORS origins for local React development |

### CORS Policy
The backend configures FastAPI `CORSMiddleware` with credentials allowed, permitting `GET`, `POST`, `OPTIONS` from the configured frontend development servers.

---

## 3. Endpoints Specification

### 3.1 Health Check

- **`GET /api/health`**
  - **Purpose:** Diagnostic health check and service identity.
  - **Response (`200 OK`):**
    ```json
    {
      "status": "ok",
      "service": "AeroTwin-UAV API",
      "version": "1.0.0"
    }
    ```

---

### 3.2 Simulation APIs

- **`POST /api/simulation/start`**
  - **Purpose:** Initializes and starts an engine simulation session with specific flight parameters, environmental conditions, and optional fault injections.
  - **Request Body (`SimulationStartRequest`):**
    ```json
    {
      "engine_id": "UAV-ENG-401",
      "mission_id": "MSN-TEST-01",
      "rpm_target": 2400.0,
      "throttle": 75.0,
      "altitude": 1500.0,
      "ambient_temperature": 25.0,
      "humidity": 45.0,
      "wind_speed": 5.0,
      "mission_duration_hours": 10.0,
      "flight_phase": "CRUISE",
      "degradation": 0.05,
      "fault_type": "NORMAL",
      "fault_severity": 0.0,
      "seed": 42
    }
    ```
  - **Response (`200 OK`):** `TelemetryResponse` representing the actual simulated state at step 0.

- **`GET /api/simulation/current`**
  - **Purpose:** Retrieves the latest simulated telemetry state.
  - **Response when active (`200 OK`):** `TelemetryResponse`.
  - **Response when standby (`200 OK`):**
    ```json
    {
      "status": "standby",
      "message": "No active simulation."
    }
    ```

---

### 3.3 Digital Twin APIs

- **`GET /api/digital-twin/status`**
  - **Purpose:** Returns the complete Digital Twin evaluation: health score, fitness score, operational status, deviations, AI fault predictions, anomaly score, and RUL.
  - **Response (`200 OK`):** `DigitalTwinResponse`.
  - **Error (`400 Bad Request`):** If no active simulation exists.

- **`GET /api/digital-twin/health`**
  - **Purpose:** Returns concise health metrics.
  - **Response (`200 OK`):**
    ```json
    {
      "engine_health": 98.5,
      "engine_fitness_score": 96.2,
      "overall_status": "OPTIMAL",
      "timestamp": "2026-09-16T20:25:00"
    }
    ```

- **`GET /api/digital-twin/deviation`**
  - **Purpose:** Returns physics-expected vs actual simulated telemetry along with normalized and relative deviations.
  - **Response (`200 OK`):** `DigitalTwinDeviationResponse`.

---

### 3.4 AI Inference APIs

- **`POST /api/ai/predict`**
  - **Purpose:** Evaluates arbitrary telemetry against the trained Random Forest classifier (`models/fault_classifier.joblib`).
  - **Request Body (`TelemetryInput`):** Accepts 13 core sensor telemetry values.
  - **Response (`200 OK`):**
    ```json
    {
      "predicted_fault": "NORMAL",
      "fault_probabilities": {
        "NORMAL": 0.94,
        "INJECTOR_ABNORMALITY": 0.01,
        "COOLING_PROBLEM": 0.02,
        "LUBRICATION_PROBLEM": 0.01,
        "MISFIRE": 0.01,
        "SENSOR_ANOMALY": 0.01
      }
    }
    ```

- **`POST /api/ai/anomaly`**
  - **Purpose:** Evaluates telemetry against the trained Isolation Forest detector (`models/anomaly_detector.joblib`).
  - **Request Body (`TelemetryInput`)**
  - **Response (`200 OK`):**
    ```json
    {
      "anomaly_status": "NORMAL",
      "anomaly_score": 0.124
    }
    ```

- **`POST /api/ai/rul`**
  - **Purpose:** Predicts remaining useful life in hours (`models/rul_model.joblib`).
  - **Request Body (`TelemetryInput`)**
  - **Response (`200 OK`):**
    ```json
    {
      "predicted_rul_hours": 420.5
    }
    ```

- **`GET /api/ai/explanation`**
  - **Purpose:** Returns human-interpretable engineering explanation synthesized from Digital Twin deviations and AI outputs without claiming absolute physical certainty.
  - **Response (`200 OK`):** `AIExplanationResponse`.

---

### 3.5 Mission Risk Decision API

- **`GET /api/mission/risk`**
  - **Purpose:** Evaluates current operational risk using the Mission Decision Engine (`MissionDecisionEngine`).
  - **Query Parameters (Optional Overrides):**
    - `mission_duration_hours`: Planned mission duration (hours).
    - `altitude_target`: Planned cruise altitude (ft).
    - `ambient_temp`: Ambient temperature (°C).
    - `weather_severity`: Weather severity index [0.0 - 1.0].
  - **Response (`200 OK`):**
    ```json
    {
      "mission_reliability_score": 92.4,
      "mission_risk": "LOW",
      "mission_recommendation": "CONTINUE_MISSION",
      "predicted_fault": "NORMAL",
      "dominant_fault_probability": 0.94,
      "anomaly_score": 0.12,
      "predicted_rul_hours": 420.5,
      "rul_margin_hours": 410.5,
      "rul_adequacy": "SUFFICIENT",
      "environmental_stress": 0.15,
      "reason_codes": [],
      "explanation": "Mission reliability is nominal. System state supports mission continuation."
    }
    ```

---

## 4. Input Validation & Bounds

All incoming data is strictly validated using Pydantic v2 schemas:

| Field | Range / Valid Values | Unit / Format |
|---|---|---|
| `throttle` | `0.0` to `100.0` | `%` |
| `altitude` | `0.0` to `8000.0` | `m` |
| `humidity` | `0.0` to `100.0` | `%` |
| `wind_speed` | `0.0` to `25.0` | `m/s` |
| `ambient_temperature` | `-40.0` to `60.0` | `°C` |
| `degradation` | `0.0` to `1.0` | Factor |
| `fault_severity` | `0.0` to `1.0` | Factor |
| `flight_phase` | `TAKEOFF`, `CLIMB`, `CRUISE`, `DESCENT`, `LOITER`, `LANDING` | Enum String |
| `fault_type` | `NORMAL`, `INJECTOR_ABNORMALITY`, `COOLING_PROBLEM`, `LUBRICATION_PROBLEM`, `MISFIRE`, `SENSOR_ANOMALY` | Enum String |
| `rul_hours` | `>= 0.0` | Non-negative hours |

Out-of-range inputs trigger HTTP `422 Unprocessable Content` with descriptive field locations.

---

## 5. Error Handling

- **`400 Bad Request`**: Handled when requests cannot be executed against current state (e.g. asking for Digital Twin status before starting a simulation).
- **`404 Not Found`**: Returned when model files or resources are not found.
- **`422 Unprocessable Entity`**: Cleanly formatted validation errors without Python stack trace leakage.
- **`500 Internal Server Error`**: Catches unhandled exceptions, logs diagnostic traces on the server console, and returns a sanitized JSON `{ "detail": "Internal server error." }`.

---

## 6. How to Run & Verify

### Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### Start Development Server
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Interactive API Documentation (Swagger & ReDoc)
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc UI:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

### Execute Test Suite
```bash
python -m pytest tests/test_api.py -v
```
All 14 tests verify endpoint functionality, schemas, validation error codes, and absence of `NaN`/`Infinity`.
