# AeroTwin-UAV Functional Mission Control Dashboard

**Project:** AeroTwin-UAV (Software-Only Research Prototype)  
**Component:** Main Operational Dashboard (`/dashboard`)  
**Step:** STEP 14  
**Status:** Fully Functional & Connected to Real-Time Telemetry Stream  

---

## 1. Overview & Operational User Flow

The AeroTwin-UAV Main Dashboard serves as the central operational cockpit for monitoring aero piston engine propulsion health, structural degradation, AI diagnostics, and mission reliability on MALE UAVs.

The real-time operational user flow is:

```
Virtual Engine Simulation (Physics-Inspired Numerical Engine)
         ↓
Real-Time Telemetry Stream (13 Channels via /ws/telemetry @ ~2 Hz)
         ↓
Digital Twin State Estimator (Thermodynamic Expectation & Residual Analysis)
         ↓
AI Diagnostic Inference (Isolation Forest Anomaly + Random Forest Classifier)
         ↓
Engine Health & Fitness Evaluation (0.0 - 100.0% Structural Scoring)
         ↓
Remaining Useful Life (RUL) Prediction (Hours to Maintenance Threshold)
         ↓
Mission Reliability & Risk Decision Engine (Reliability Index & Abort Advisory)
         ↓
Mission Control Dashboard (Central Operational Overview)
```

---

## 2. Dashboard Sections & Component Architecture

### Section 1: Top Status Bar (`TopBar.jsx`)
- **System Connection Status:** Displays `SYSTEM: ONLINE` (pulsing emerald indicator) when connected, `CONNECTING...` / `RECONNECTING...` during network changes, or `OFFLINE` when disconnected.
- **Telemetry Connection Status:** Dedicated indicator showing `TELEMETRY: CONNECTED` / `DISCONNECTED`.
- **Engine Simulation Status:** Displays the current active flight phase (`SIM ENGINE: CRUISE`, `TAKEOFF`, `CLIMB`, or `STANDBY`).
- **Operator & Ground Station Status:** Identifies logged-in operator clearance (`OPERATOR 01 // GROUND STATION`).

---

### Section 2: Engine Health Cards
Four primary telemetry indices rendered as high-visibility cards:
1. **Engine Health %:** Overall structural health composite ($0.0 - 100.0\%$), tracking physical wear and sensor agreement.
2. **Engine Fitness Score %:** Thermodynamic performance baseline score relative to nominal new-engine specifications.
3. **Mission Risk:** Real-time risk categorization (`LOW`, `MEDIUM`, `HIGH`) with action recommendations (`CONTINUE_MISSION`, `PROCEED_WITH_CAUTION`, `ABORT_RECOMMENDED`).
4. **Remaining Useful Life (RUL):** Continuous degradation projection in hours before maintenance is required.

---

### Section 3: Propulsion Telemetry (8 Core Channels)
Live multi-channel sensor grid with nominal operational thresholds and dynamic status coloring:

| Channel | Code | Nominal Operational Envelope | Unit | Monitored Physical Subsystem |
|---|---|---|---|---|
| **Engine Speed** | `RPM` | $2000 - 2700$ | RPM | Rotational speed / propeller governor |
| **Cylinder Head Temp** | `CHT` | $80 - 130$ | °C | Combustion chamber thermal envelope |
| **Exhaust Gas Temp** | `EGT` | $700 - 850$ | °C | Air-fuel mixture & exhaust manifolds |
| **Oil Pressure** | `OIL_P` | $2.0 - 5.0$ | bar | Lubrication pump & hydrodynamic bearings |
| **Oil Temperature** | `OIL_T` | $70 - 105$ | °C | Thermal heat exchanger / oil cooler |
| **Chassis Vibration** | `VIB` | $< 5.0$ | g | Mechanical unbalance & structural misfire |
| **Fuel Flow Rate** | `FF` | $15.0 - 38.0$ | L/h | High-pressure injection fuel delivery |
| **Engine Load** | `LOAD` | $40 - 85$ | % | Power output / manifold pressure proxy |

---

### Section 4: Live Telemetry Chart (`TelemetryStreamChart.jsx`)
- High-frequency real-time Recharts stream drawing from a 30-sample sliding buffer.
- Visualizes:
  - **RPM** (Cyan `#06b6d4`)
  - **EGT** (Amber `#f59e0b`)
  - **CHT** (Pink/Rose `#f43f5e`)
  - **Vibration** (Purple `#a855f7`)
- Interactive filter toggles:
  - `ALL`: Complete waveform overview.
  - `THERMAL`: Focused CHT & EGT heat analysis.
  - `ROTATIONAL`: RPM & mechanical vibration surveillance.

---

### Section 5: Digital Twin Status
- **Overall Engine State:** Displays active status badge (`OPTIMAL`, `NOMINAL`, `DEGRADED`, `CRITICAL`).
- **Expected vs Actual & Deviations Table:**
  - Compares simulated live sensor readings against physics baseline expectations ($\Delta\text{RPM}$, $\Delta\text{CHT}$, $\Delta\text{EGT}$, $\Delta\text{OIL\_P}$).
  - Flags deviations as `NORMAL`, `WARNING`, or `CRITICAL` with tolerance thresholds.
- **Active Engine Tracking:** Displays connected Engine ID (`ENGINE-001`).

---

### Section 6: AI Predictive Status
- **AI Inference Status:** Live indicator showing `INFERENCE ACTIVE // STREAMING` or `STANDBY`.
- **Predicted Fault Class:** Identifies current classified operating condition (`NORMAL`, `INJECTOR_ABNORMALITY`, `COOLING_PROBLEM`, `LUBRICATION_PROBLEM`, `MISFIRE`, `SENSOR_ANOMALY`).
- **Fault Probability Confidence:** Displays dominant class softmax probability ($0 - 100\%$).
- **Isolation Forest Anomaly Status & Score:** Normalized reconstruction score ($0.0000 - 1.0000$) and anomaly classification (`NORMAL` vs `ANOMALOUS`).
- **Predicted RUL Hours:** Random Forest regressor output with non-negative lower bound enforcement.

---

### Section 7: Mission Risk & Advisory Status
- **Mission Risk Badge:** Visual risk classification (`LOW`, `MEDIUM`, `HIGH`).
- **Mission Reliability Score:** Dynamic progress bar showing composite survivability probability ($0.0 - 100.0\%$).
- **Autonomous Recommendation:** Clear actionable flight command (`CONTINUE_MISSION`, `PROCEED_WITH_CAUTION`, `RETURN_TO_BASE`).
- **Evaluation Reason Codes:** Transparent diagnostic flags triggering risk changes (e.g. `HIGH_CHT`, `LOW_OIL_PRESSURE`, `HIGH_VIBRATION`, `INSUFFICIENT_RUL_MARGIN`).

---

### Section 8: Connection & Fallback States
- **When Disconnected:**
  - Status indicators display `DISCONNECTED` / `OFFLINE` with slate/red styling.
  - Sensor channels display clean, non-misleading unavailable placeholders (`--`).
  - No synthetic/fake data is invented.
  - Automatic reconnection backoff periodically polls for backend restoration.
- **When Connected:**
  - Automatically transitions to `CONNECTED` (pulsing emerald indicator).
  - All metrics and charts update in real-time from backend packets without user intervention.

---

## 3. How to Run & Verify the Dashboard

1. **Start the FastAPI REST & WebSocket Backend:**
   ```bash
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the React Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to Cockpit:**
   Open `http://localhost:3000/dashboard` in a browser.
   - The status bar will show `SYSTEM: ONLINE`, `TELEMETRY: CONNECTED`, and `SIM ENGINE: CRUISE`.
   - All 8 propulsion channels and 4 health metrics will stream live data.
   - The waveform plot will buffer and track recent parameters.
