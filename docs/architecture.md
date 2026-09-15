# AeroTwin-UAV: System Architecture & Data Flow

AI-Enabled Real-Time Digital Twin System for Health Monitoring, Fault Prediction and Mission Reliability of Aero Piston Engines in MALE UAVs.

> **Research & Demo Prototype Notice:** This is a software-only implementation. No physical engine or physical IoT sensors are required. Telemetry is synthesized via high-fidelity numerical simulation.

---

## 1. End-to-End System Pipeline

```
User (Mission Planner / Operator)
  │
  ▼
Mission & Engine Simulation Engine
  │ (Altitude, Throttle, Mach, Ambient Temp/Pressure, Flight Phases)
  ▼
Virtual Aero Piston Engine (Thermodynamic & Mechanical Dynamics)
  │
  ▼
Simulated Sensor Telemetry Generator
  │ (RPM, MAP, CHT, EGT, Oil Press/Temp, Fuel Flow, Vibration + Realistic Noise/Drift)
  ▼
Digital Twin State Estimator & Synchronizer
  │ (Real-Time Physics Verification vs Sensor Stream)
  ▼
AI/ML Analytics Pipeline
  │ (Anomaly Detection, Fault Classification, Remaining Useful Life - RUL)
  ▼
Engine Health & Fitness Index Scoring
  │ (Subsystem Degradation Indices, Overall Engine Health Score)
  ▼
Mission Reliability & Risk Assessment
  │ (Probability of Mission Success, Abort Risk Thresholds)
  ▼
Actionable Maintenance Recommendations
  │ (RUL-driven alerts, condition-based inspection intervals)
  ▼
Real-Time React Dashboard + 3D Interactive Digital Twin + What-If Mission Simulator
```

---

## 2. Core Subsystem Responsibilities

### Virtual Engine & Telemetry Simulation (`backend/app/services/`)
- Simulates a multi-cylinder aero piston engine (e.g., Rotax 914 / 915 iS class typically deployed on MALE UAVs).
- Computes combustion cycle approximations, manifold pressure dynamics, fuel injection rates, cylinder head temperatures (CHT), exhaust gas temperatures (EGT), oil lubrication pressure/temperature, and rotational vibration.
- Injects synthetic sensor noise, sensor drift, and selectable fault injection modes (e.g., injector clogging, valve leakage, cooling degradation, oil pump loss).

### Digital Twin & AI/ML Analytics (`backend/app/` & `models/`)
- **State Synchronizer**: Compares the incoming simulated telemetry against the nominal digital twin physics baseline to extract engineering residuals.
- **Anomaly Detection**: Unsupervised/semi-supervised anomaly detection (Isolation Forest / Autoencoder / PCA residual analysis).
- **Fault Prediction & Classification**: Multi-class classification identifying fault modes early.
- **Remaining Useful Life (RUL)**: Degradation trajectory regression modeling time/hours to critical threshold.
- **Health & Fitness Score**: Composite metric (0-100%) scoring overall engine readiness.
- **Mission Reliability Engine**: Evaluates whether the engine can sustain remaining mission phases (climb, loiter, dash, descent).

### Real-Time Communication & APIs (`backend/app/api/`)
- **FastAPI REST API**: Historical telemetry query, model inference trigger, mission configuration, and what-if simulation control.
- **WebSocket Streaming**: Continuous bidirectional telemetry and twin state updates broadcast to the dashboard at configurable Hertz (e.g., 5 Hz to 20 Hz).

### Interactive Frontend & 3D Visualization (`frontend/`)
- **React + Vite + Tailwind CSS**: Mission control UI layout, subsystem cards, alert feed, and fitness gauges.
- **Three.js / React Three Fiber**: 3D interactive model of the UAV aero piston engine with real-time heat mapping (CHT/EGT), component inspection, and dynamic state indication.
- **Recharts**: High-frequency real-time trendlines, sensor vs digital twin residual charts, and degradation curves.
- **What-If Mission Simulator UI**: Interface to adjust throttle profiles, atmospheric conditions, and induce failure scenarios to evaluate reliability in real-time.
