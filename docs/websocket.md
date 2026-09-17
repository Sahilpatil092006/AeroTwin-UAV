# AeroTwin-UAV Real-Time WebSocket Telemetry Documentation

**Project:** AeroTwin-UAV (Software-Only Research Prototype)  
**Component:** Real-Time Telemetry Streaming (`/ws/telemetry`)  
**Step:** STEP 12  
**Protocol:** WebSocket (`ws://` / `wss://`)  
**Status:** Backend Real-Time Streaming Operational (*React integration reserved strictly for STEP 13*)  

---

## 1. Pipeline & Architecture

The real-time WebSocket telemetry pipeline connects the physics-inspired virtual engine simulation, the Digital Twin state tracker, trained AI models, and the mission reliability decision engine into a unified, low-latency JSON telemetry stream.

```
Virtual Engine Simulator (Step 8)
        ↓
Telemetry Generation (rpm, cht, egt, oil, vibration, fuel, load)
        ↓
Digital Twin State Tracker (Step 9 - baseline, deviations, health)
        ↓
AI Inference (Steps 5, 6, 7 - fault classifier, anomaly detector, RUL)
        ↓
Mission Risk & Decision Engine (Step 10 - reliability, risk level, advisory)
        ↓
FastAPI WebSocket Router (Step 12 - /ws/telemetry)
        ↓
React-ready JSON Stream (STEP 13 - Frontend Integration)
```

> [!IMPORTANT]
> In STEP 12, the backend pipeline is verified and operational for WebSocket streaming. React frontend connection is **NOT IMPLEMENTED** in this step and will be integrated in **STEP 13**.

---

## 2. WebSocket Endpoint

- **URI:** `ws://localhost:8000/ws/telemetry`
- **Protocol:** RFC 6455 WebSocket
- **Transport:** Asynchronous JSON framing via FastAPI / Starlette WebSocket layer

---

## 3. Telemetry Flow & Lifecycle

1. **Client Connection:**
   - The client establishes a WebSocket connection to `/ws/telemetry`.
   - The server accepts the connection and immediately transmits a connection acknowledgement message:
     ```json
     {
       "type": "connection",
       "status": "connected",
       "message": "AeroTwin-UAV telemetry stream started"
     }
     ```
2. **Simulation Initialization:**
   - If an active simulation is not already running, the server initializes a default deterministic cruise flight profile (`ENGINE-001`, `MISSION-001`, `CRUISE`, 2400 RPM target).
   - If an active simulation already exists, the stream continuously advances that simulation.
3. **Periodic Step & Transmission:**
   - Every **0.5 seconds** (`asyncio.sleep(0.5)`), the pipeline:
     - Advances the engine simulation state by discrete time $\Delta t$.
     - Computes physics baseline expectations and parameter deviations.
     - Runs AI inferences (Random Forest fault classifier, Isolation Forest anomaly detector, and RUL regressor).
     - Calculates multi-factor Mission Reliability and Risk status.
     - Validates numerical safety (finite numbers, bounded scores).
     - Serializes the entire state packet to JSON and transmits it to the client.
4. **Clean Disconnection:**
   - When the client disconnects (browser window close, component unmount, or network closure), the server catches `WebSocketDisconnect`, breaks the streaming loop, releases resources cleanly without server crashes, and logs:
     `Telemetry WebSocket disconnected.`

---

## 4. Message Structure Specification

Every message is a validated JSON object containing four discrete domains:

```json
{
  "type": "telemetry",
  "timestamp": "2026-09-16T20:45:00",
  "engine_id": "ENGINE-001",
  "mission_id": "MISSION-001",
  "flight_phase": "CRUISE",

  "telemetry": {
    "rpm": 2401.8,
    "throttle": 75.0,
    "altitude": 1500.0,
    "ambient_temperature": 25.0,
    "humidity": 45.0,
    "wind_speed": 5.0,
    "cht": 91.5,
    "egt": 794.4,
    "oil_pressure": 2.79,
    "oil_temperature": 86.4,
    "vibration": 2.45,
    "fuel_flow": 28.3,
    "engine_load": 74.2
  },

  "digital_twin": {
    "expected_telemetry": {
      "rpm": 2400.0,
      "cht": 90.0,
      "egt": 800.0,
      "oil_pressure": 3.0,
      "oil_temperature": 85.0,
      "vibration": 2.0,
      "fuel_flow": 28.0,
      "engine_load": 75.0
    },
    "deviations": {
      "cht": {
        "param_name": "cht",
        "unit": "°C",
        "actual": 91.5,
        "expected": 90.0,
        "absolute_deviation": 1.5,
        "relative_deviation_pct": 1.67,
        "normalized_deviation": 0.15,
        "status": "NORMAL"
      }
    },
    "engine_health": 95.8,
    "engine_fitness_score": 94.2,
    "overall_status": "OPTIMAL"
  },

  "ai": {
    "predicted_fault": "NORMAL",
    "fault_probabilities": {
      "NORMAL": 0.9412,
      "INJECTOR_ABNORMALITY": 0.0125,
      "COOLING_PROBLEM": 0.0210,
      "LUBRICATION_PROBLEM": 0.0102,
      "MISFIRE": 0.0081,
      "SENSOR_ANOMALY": 0.0070
    },
    "anomaly_status": "NORMAL",
    "anomaly_score": 0.1250,
    "predicted_rul_hours": 650.0
  },

  "mission": {
    "mission_reliability_score": 93.4,
    "mission_risk": "LOW",
    "mission_recommendation": "CONTINUE_MISSION",
    "reason_codes": []
  }
}
```

---

## 5. Numerical Safety & Verification

Before transmitting any message, the server enforces strict numerical validation:
- **No Non-Finite Values:** `math.isnan()` and `math.isinf()` are strictly guarded; encountering either raises an explicit server exception rather than emitting corrupt JSON.
- **Engine Health & Fitness:** Clamped within $[0.0, 100.0]$.
- **Anomaly Score:** Normalized and clamped within $[0.0, 1.0]$.
- **AI Probabilities:** Clamped within $[0.0, 1.0]$ and sum to $1.0$.
- **RUL Hours:** Strictly non-negative ($\ge 0.0$).
- **Native Python Serialization:** All NumPy types (`float32`, `float64`, `int64`, `ndarray`) are converted to standard Python primitives (`float`, `int`, `list`, `dict`).

---

## 6. Error Handling

If an unexpected exception occurs in the engine simulator, Digital Twin, or model inference pipeline during streaming:
1. The server catches the exception without crashing the FastAPI process.
2. An error packet is dispatched to the client:
   ```json
   {
     "type": "error",
     "message": "An internal error occurred in the telemetry pipeline."
   }
   ```
3. Full stack traces are preserved in backend server diagnostic logs and never leaked over the WebSocket interface.

---

## 7. How to Test the WebSocket

### 1. Start the Backend Server
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Run the Dedicated CLI Test Client
```bash
python scripts/test_websocket.py
```

The script will:
- Connect to `ws://localhost:8000/ws/telemetry`.
- Receive and print 5 consecutive real-time telemetry updates.
- Verify schema integrity, numerical bounds, and absence of `NaN`/`Inf`.
- Output `WEBSOCKET TEST PASSED` and disconnect cleanly.

### 3. Run Automated Pytest Suite
```bash
python -m pytest tests/test_websocket.py -v
```
Verifies:
- Connection and handshake.
- Packet structure across all 4 domains (telemetry, digital twin, AI, mission).
- Numerical bounds and serialization.
- Reconnection and clean disconnect handling.
- Dynamic evolution of telemetry across timesteps.
