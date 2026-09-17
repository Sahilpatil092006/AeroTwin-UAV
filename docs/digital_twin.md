# AeroTwin-UAV Digital Twin Architecture & State Estimation

> **SYSTEM CLASSIFICATION: SOFTWARE PROTOTYPE RESEARCH DOCUMENTATION**  
> *"The AeroTwin-UAV Digital Twin is a software prototype based on physics-inspired simulation and synthetic telemetry. It is not a certified operational aircraft-engine digital twin."*

---

## 1. Digital Twin Concept

In the AeroTwin-UAV architecture, the **Digital Twin** is the living software representation of a virtual Rotax 914/915 iS class aero piston engine. Operating alongside the UAV flight stream, it continuously mirrors the engine's physical, thermodynamic, and mechanical state in real time.

The Digital Twin serves as the cognitive analytical bridge between raw sensor observations and actionable mission decisions:
- It maintains an internal mathematical baseline of how a pristine, healthy engine should perform under the current operational demands (throttle, RPM, altitude, flight phase).
- It quantifies the gap (residuals/deviations) between expected physical behavior and observed sensor readings.
- It unifies multi-model AI inference (Unsupervised Anomaly Detection, Multi-Class Fault Classification, and Prognostic RUL Regression) with deterministic physical thresholds into a synchronized `DigitalTwinState`.

---

## 2. Simulator → Digital Twin Relationship

The simulator and the Digital Twin are purposefully decoupled into separate layers:

```text
┌────────────────────────────────────────────────────────┐
│ Virtual Aero Piston Engine Simulator                   │
│ (backend/app/simulation/)                             │
│ - 4-Stroke Thermodynamics, Gas Expansion, Kinematics   │
│ - Continuous Degradation & Operational Fault Injection │
│ - Flight Phase Progression & Sensor Gaussian Noise     │
└───────────────────────────┬────────────────────────────┘
                            │ Simulated Sensor Telemetry
                            ▼
┌────────────────────────────────────────────────────────┐
│ AeroTwin-UAV Digital Twin Core                         │
│ (backend/app/digital_twin/)                            │
│ 1. Theoretical Physics Baseline Generator              │
│ 2. Parameter Deviation Analyzer                        │
│ 3. Tri-Model AI Inference Fusion                       │
│ 4. Composite Health & Operational Fitness Scoring      │
│ 5. Overall Status Decision Logic                       │
└───────────────────────────┬────────────────────────────┘
                            │ DigitalTwinState (JSON / DTO)
                            ▼
                 Downstream Mission Dashboard /
                 3D Visualization & What-If Simulator
```

The simulator embodies the virtual physical aircraft, while the Digital Twin embodies the real-time health-monitoring avionics computing diagnostic states from telemetry alone.

---

## 3. Expected vs. Actual Telemetry

To detect subtle degradation before catastrophic threshold crossings occur, the Digital Twin computes expected baseline values for each operational parameter:

$$\hat{y}_{\text{expected}} = f_{\text{physics}}(\text{Throttle}, \text{Altitude}, T_{\text{ambient}}, \text{FlightPhase})$$

The baseline model does **not** copy actual telemetry. Instead, it evaluates the thermodynamic energy balance:
- **Expected Load**: Evaluated from flight phase envelope and air density lapse rate $\rho / \rho_0 = e^{-h / 8500}$.
- **Expected RPM**: Derived from throttle angle command and propeller governor curve ($1800 - 5800\text{ RPM}$).
- **Expected CHT**: Computed from cylinder thermal equilibrium between combustion heat generation and ram air dissipation.
- **Expected EGT**: Grounded in stoichiometric fuel-air combustion heat release.
- **Expected Oil Pressure**: Driven by crankshaft-coupled oil pump displacement minus thermal viscosity drop $\Delta P \propto -0.012 \max(0, T_{\text{oil}} - 80)$.
- **Expected Vibration**: Modeled as baseline structural unbalance scaling quadratically with rotational velocity $(\text{RPM} / \text{RPM}_{\max})^2$.

---

## 4. Deviation Calculation

For each of the 8 primary telemetry parameters (`rpm`, `cht`, `egt`, `oil_pressure`, `oil_temperature`, `vibration`, `fuel_flow`, `engine_load`), the Digital Twin calculates three metrics:

1. **Absolute Deviation**:
   $$\Delta_{\text{abs}} = |x_{\text{actual}} - x_{\text{expected}}|$$
2. **Relative Percentage Deviation**:
   $$\Delta_{\text{rel}} = \frac{x_{\text{actual}} - x_{\text{expected}}}{x_{\text{expected}}} \times 100\%$$
   *(Protected against division-by-zero if expected value is zero).*
3. **Normalized Deviation**:
   $$\Delta_{\text{norm}} = \frac{|x_{\text{actual}} - x_{\text{expected}}|}{\text{Tolerance}_x}$$
   Where $\text{Tolerance}_x$ represents the allowable normal variance for that sensor channel (e.g., $15.0^\circ\text{C}$ for CHT, $0.5\text{ bar}$ for oil pressure).

Each parameter is categorized into `NORMAL`, `WARNING`, or `CRITICAL` based on defined prototype operating limits.

---

## 5. Engine Health Score

The **Engine Health Score** ($0.0 - 100.0$) quantifies the physical structural and thermal integrity of the engine:

- **$80.0 - 100.0$**: **HEALTHY** (Minimal mechanical wear, nominal thermal dissipation).
- **$50.0 - 79.9$**: **WARNING** (Subtle component degradation, elevated vibration or thermal drift).
- **$0.0 - 49.9$**: **CRITICAL** (Severe mechanical distress, loss of lubrication, or extreme overheating).

### Configurable Penalty Weighting
Health penalties scale non-linearly when parameter deviations exceed allowable tolerances, prioritizing critical propulsion channels:
- **Oil Pressure Weight**: $25\%$
- **Crankcase Vibration Weight**: $25\%$
- **Cylinder Head Temp (CHT) Weight**: $25\%$
- **Exhaust Gas Temp (EGT) Weight**: $12\%$
- **Oil Temperature Weight**: $6\%$
- **Rotational Speed (RPM) Weight**: $4\%$
- **Fuel Flow Weight**: $2\%$
- **Engine Load Weight**: $1\%$

---

## 6. Engine Fitness Score

The **Engine Fitness Score** ($0.0 - 100.0$) measures instantaneous operational conformity—how faithfully the engine is executing its commanded flight profile relative to expected performance.

### Distinction: Engine Health vs. Engine Fitness
- **Engine Health**: Represents cumulative mechanical and thermal integrity (long-term structural wear and redline safety margins).
- **Engine Fitness**: Represents dynamic operational tracking fidelity, capturing instantaneous throttle response, combustion smoothness, unsupervised anomaly scores, and active fault severity.

An engine with $95\%$ health might exhibit temporarily reduced fitness ($82\%$) during rapid throttle transients or moderate atmospheric turbulence. Conversely, an engine with low health ($45\%$) cannot achieve high fitness due to ongoing structural degradation.

---

## 7. AI Model Integration & Fusion

The Digital Twin integrates three pretrained Scikit-Learn models without modifying their weights:

```text
Telemetry Feature Vector (13 Channels)
[rpm, throttle, altitude, ambient_temp, humidity, wind_speed,
 cht, egt, oil_pressure, oil_temp, vibration, fuel_flow, engine_load]
              │
              ├──► Fault Classifier (RandomForestClassifier, 200 trees)
              │    └──► Predicted Class + Class Probability Distribution (6 classes)
              │
              ├──► Anomaly Detector (IsolationForest, 200 trees)
              │    └──► Status ('NORMAL' / 'ANOMALOUS') + Anomaly Score [0.0, 1.0]
              │
              └──► RUL Regressor (RandomForestRegressor, 200 trees)
                   └──► Remaining Operating Hours (Clipped >= 0.0 hrs)
```

All three models process feature vectors with strict target-leakage isolation. If any model artifact is missing, a structured `DigitalTwinModelLoadError` is raised rather than producing synthetic or mocked AI results.

---

## 8. Unsupervised Anomaly Detection

- Model: `IsolationForest` trained exclusively on nominal `NORMAL` flight regimes.
- Raw Decision Function: Mapped to a normalized metric $S_{\text{anomaly}} \in [0.0, 1.0]$:
  $$S_{\text{anomaly}} = \text{clip}\left(\frac{\text{df}_{\max} - \text{df}}{\text{df}_{\max} - \text{df}_{\min}}, 0.0, 1.0\right)$$
- Detects novel failure signatures, sensor drift, and multivariate operational outliers even before a specific fault classifier label is recognized.

---

## 9. Multi-Class Fault Classification

- Model: `RandomForestClassifier` evaluating 6 distinct operational fault classes:
  1. `NORMAL`
  2. `INJECTOR_ABNORMALITY`
  3. `COOLING_PROBLEM`
  4. `LUBRICATION_PROBLEM`
  5. `MISFIRE`
  6. `SENSOR_ANOMALY`
- Outputs both the most probable discrete classification and full posterior probability distributions across all 6 classes.

---

## 10. Remaining Useful Life (RUL) Prognostics

- Model: `RandomForestRegressor` predicting estimated operating hours remaining until maintenance shutdown.
- Output: `predicted_rul_hours` continuous value clipped to $\ge 0.0\text{ hours}$.
- Directly informs downstream mission planning regarding whether an engine possesses adequate remaining life margin for extended UAV missions.

---

## 11. Overall Engine Status

The Digital Twin synthesizes composite health, fitness, anomaly detection, fault prediction, and parameter limits into a decisive tri-state operational health indicator:

- **`HEALTHY`**:
  - Engine Health $\ge 80.0$
  - Engine Fitness $\ge 80.0$
  - Predicted Fault is `NORMAL`
  - Anomaly Status is `NORMAL`
  - No parameters in WARNING or CRITICAL limits.
- **`WARNING`**:
  - Engine Health or Fitness between $50.0$ and $79.9$
  - Unsupervised Anomaly detected ($S_{\text{anomaly}}$ elevated)
  - Non-NORMAL fault class predicted with moderate confidence
  - Any sensor channel in WARNING boundary.
- **`CRITICAL`**:
  - Engine Health or Fitness $< 50.0$
  - Critical sensor (Oil Pressure, CHT, Vibration) in CRITICAL boundary
  - Severe fault predicted (`LUBRICATION_PROBLEM`, `MISFIRE`, `COOLING_PROBLEM`) with depressed health.

---

## 12. Limitations

1. **Software Prototype Grounding**: All models and baseline equations are trained and benchmarked on physics-inspired synthetic telemetry rather than FAA-certified physical flight-test logs.
2. **Simplified Heat Transfer**: Thermal dynamics use first-order lumped parameter differential approximations rather than full Navier-Stokes aerothermal simulation.
3. **Decision-Support Classification**: The Digital Twin is an engineering research prototype designed to demonstrate digital twin concepts for MALE UAVs; it is not approved for operational avionics dispatch or life-critical flight control.
