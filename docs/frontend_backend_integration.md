# AeroTwin-UAV Frontend-to-Backend Integration Documentation

**Project:** AeroTwin-UAV (Software-Only Research Prototype)  
**Component:** React Frontend <-> FastAPI Backend & Real-Time WebSocket Pipeline  
**Step:** STEP 13  
**Status:** Integrated & Verified  

---

## 1. Architecture Overview

In STEP 13, the React frontend mission-control dashboard is connected directly to the FastAPI REST backend and real-time WebSocket telemetry stream.

```
┌───────────────────────────────────────────────────────────┐
│                    FastAPI Backend                        │
│            http://localhost:8000                          │
│   ├── REST APIs: /api/health, /api/simulation, ...        │
│   └── WebSocket: /ws/telemetry (~2 Hz update stream)       │
└─────────────────────────────┬─────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │ JSON Telemetry Stream         │
              │ REST Requests                 │
              ▼                               ▼
┌─────────────────────────────┐ ┌───────────────────────────┐
│   frontend/src/services/    │ │ frontend/src/hooks/       │
│   api.js (Axios Client)     │ │ useWebSocket.js           │
└─────────────┬───────────────┘ └─────────────┬─────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│        frontend/src/context/TelemetryContext.jsx          │
│   (Global Telemetry Provider & Historical Trend Buffer)   │
└─────────────────────────────┬─────────────────────────────┘
                              │
    ┌─────────────────────────┼─────────────────────────┐
    ▼                         ▼                         ▼
┌──────────────┐       ┌──────────────┐          ┌──────────────┐
│ TopBar.jsx   │       │ Dashboard    │          │ Monitoring   │
│ (Conn Status)│       │ (14 Metrics) │          │ Digital Twin │
│              │       │              │          │ AI & Mission │
└──────────────┘       └──────────────┘          └──────────────┘
```

---

## 2. API Service Layer (`frontend/src/services/api.js`)

Configured with base URL `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'`.

Provides structured asynchronous modules:
- **`healthApi.check()`**: Invokes `GET /api/health` to verify service availability.
- **`simulationApi.start(params)`**: Invokes `POST /api/simulation/start` with validated flight parameters.
- **`simulationApi.getCurrent()`**: Invokes `GET /api/simulation/current` to inspect active engine physics state.
- **`digitalTwinApi.getStatus()`**: Invokes `GET /api/digital-twin/status` to retrieve the complete digital twin state.
- **`digitalTwinApi.getHealth()`**: Invokes `GET /api/digital-twin/health` for engine health and fitness metrics.
- **`digitalTwinApi.getDeviation()`**: Invokes `GET /api/digital-twin/deviation` for expected vs actual sensor comparisons.
- **`aiApi.predict(telemetry)`**: Invokes `POST /api/ai/predict` for multi-class fault classification.
- **`aiApi.anomaly(telemetry)`**: Invokes `POST /api/ai/anomaly` for Isolation Forest anomaly scoring.
- **`aiApi.rul(telemetry)`**: Invokes `POST /api/ai/rul` for remaining operating hours estimation.
- **`aiApi.getExplanation()`**: Invokes `GET /api/ai/explanation` for synthesized diagnostic rationale.
- **`missionApi.getRisk(params)`**: Invokes `GET /api/mission/risk` for autonomous mission reliability assessment.

---

## 3. Real-Time WebSocket Hook (`frontend/src/hooks/useWebSocket.js`)

Connects to `ws://localhost:8000/ws/telemetry` and provides:
1. **Lifecycle Management**:
   - `CONNECTING`: Attempting initial socket handshake.
   - `CONNECTED`: Active full-duplex session established; telemetry receiving.
   - `DISCONNECTED`: Connection closed or server unreachable.
   - `RECONNECTING`: Automatic backoff retry sequence active.
2. **Auto-Reconnection**:
   - In case of network drop or backend server restart, attempts reconnect every 3000ms.
3. **Safe Teardown**:
   - Cleanly closes the WebSocket connection on component unmount without memory leaks or unhandled exception alerts.

---

## 4. Central Telemetry State (`frontend/src/context/TelemetryContext.jsx`)

The application root in `App.jsx` is wrapped in `<TelemetryProvider>`, exposing:
- `isConnected`: Boolean flag.
- `status`: Current connection state (`CONNECTED`, `CONNECTING`, `RECONNECTING`, `DISCONNECTED`).
- `packet`: Complete latest JSON payload containing `telemetry`, `digital_twin`, `ai`, and `mission`.
- `telemetry`: 8 primary propulsion channels (`rpm`, `cht`, `egt`, `oil_pressure`, `oil_temperature`, `vibration`, `fuel_flow`, `engine_load`).
- `digitalTwin`: Twin expectations, deviations, and health scores.
- `ai`: Fault classification, anomaly status, and RUL hours.
- `mission`: Mission reliability score, risk category, and action recommendations.
- `history`: Sliding window buffer (up to 30 timesteps) providing real-time data for the Recharts line charts.

---

## 5. Dashboard Live Data Mapping

All placeholder and standby values on the Mission Control Dashboard now render live backend data:

| Metric / Channel | Component | Source Field | Nominal Threshold |
|---|---|---|---|
| **Connection Link** | `PageHeader` | `status`, `isConnected` | `CONNECTED` / `DISCONNECTED` |
| **Engine Health** | `HealthIndicator` | `digital_twin.engine_health` | $0.0 - 100.0\%$ |
| **Engine Fitness** | `HealthIndicator` | `digital_twin.engine_fitness_score` | $0.0 - 100.0\%$ |
| **Mission Risk** | `MetricCard` | `mission.mission_risk` | `LOW` / `MEDIUM` / `HIGH` |
| **Predicted RUL** | `MetricCard` | `ai.predicted_rul_hours` | $\ge 0.0\text{ hrs}$ |
| **Engine Speed (RPM)** | `TelemetryCard` | `telemetry.rpm` | $2000 - 2700\text{ RPM}$ |
| **Cylinder Head Temp** | `TelemetryCard` | `telemetry.cht` | $80 - 130\ ^\circ\text{C}$ |
| **Exhaust Gas Temp** | `TelemetryCard` | `telemetry.egt` | $700 - 850\ ^\circ\text{C}$ |
| **Oil Pressure** | `TelemetryCard` | `telemetry.oil_pressure` | $2.0 - 5.0\text{ bar}$ |
| **Oil Temperature** | `TelemetryCard` | `telemetry.oil_temperature` | $70 - 105\ ^\circ\text{C}$ |
| **Chassis Vibration** | `TelemetryCard` | `telemetry.vibration` | $< 5.0\text{ g}$ |
| **Fuel Flow Rate** | `TelemetryCard` | `telemetry.fuel_flow` | $15.0 - 38.0\text{ L/h}$ |
| **Engine Load** | `TelemetryCard` | `telemetry.engine_load` | $40 - 85\%$ |
| **Waveform Trend** | `TelemetryStreamChart` | `history` (sliding buffer) | Real-time trend |
| **Engine Status** | `StatusCard` | `digital_twin.overall_status` | `OPTIMAL`, `NOMINAL`, `DEGRADED`, `CRITICAL` |
| **Active Faults** | `SectionCard` | `ai.predicted_fault`, `ai.anomaly_score` | Fault class & anomaly state |
| **Mission Advisory** | `SectionCard` | `mission.mission_recommendation` | `CONTINUE_MISSION` / `PROCEED_WITH_CAUTION` |

---

## 6. Verification & Testing

### 1. Run Automated Frontend Contract Tests
```bash
cd frontend
npm test
```

### 2. Run Backend & Contract Pytest Suite
```bash
python -m pytest tests/test_frontend_backend_contract.py -v
python -m pytest tests/ -v
```

### 3. Build Frontend Production Bundle
```bash
cd frontend
npm run build
```
Result: Compiles with 0 errors.

### 4. Run Development Stack
In Terminal 1 (Backend):
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` (or `http://localhost:5173`) to view the live dashboard receiving real-time engine telemetry, Digital Twin analysis, AI diagnostics, and mission risk calculations.
