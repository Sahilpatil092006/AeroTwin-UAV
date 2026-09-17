# AeroTwin-UAV Mission Risk & Reliability Decision Engine

> **SYSTEM CLASSIFICATION: SOFTWARE PROTOTYPE RESEARCH DOCUMENTATION**  
> *"The Mission Risk Engine provides prototype decision support based on simulated telemetry and AI model outputs. It is not certified aviation safety software and does not control or command an aircraft."*

---

## 1. Purpose of the Decision Engine

The **Mission Risk & Reliability Decision Engine** (`backend/app/decision/`) represents the high-level decision-support tier of the AeroTwin-UAV digital twin architecture. While the Digital Twin tracks physical deviations and evaluates component-level AI models (Faults, Anomalies, RUL), the Mission Risk Engine bridges the gap between diagnostic telemetry and mission-level operational dispatch decisions.

It assesses whether the virtual aero piston engine can safely and reliably fulfill a specified mission profile (given altitude, ambient temperature, throttle demand, and planned flight duration), producing:
1. **Mission Reliability Score ($0.0 - 100.0$)**
2. **Mission Risk Classification (`LOW`, `MEDIUM`, `HIGH`)**
3. **Operational Recommendation (`SAFE_TO_PROCEED`, `PROCEED_WITH_CAUTION`, `MISSION_NOT_RECOMMENDED`)**
4. **Structured Diagnostic Reason Codes**
5. **Contextual Human-Readable Decision Explanation**

---

## 2. Decision Engine Inputs

The decision engine ingests real-time Digital Twin state estimation paired with planned mission profile parameters:

### Digital Twin Diagnostic State Inputs
- `engine_health`: Overall physical mechanical/thermal health index ($0.0 - 100.0$)
- `engine_fitness_score`: Instantaneous operational tracking fidelity ($0.0 - 100.0$)
- `predicted_fault`: Most probable discrete fault class (`NORMAL`, `INJECTOR_ABNORMALITY`, `COOLING_PROBLEM`, `LUBRICATION_PROBLEM`, `MISFIRE`, `SENSOR_ANOMALY`)
- `fault_probabilities`: Posterior probability distribution over all 6 fault classes
- `anomaly_status`: Unsupervised status (`NORMAL` / `ANOMALOUS`)
- `anomaly_score`: Normalized anomaly outlier index ($0.0 - 1.0$)
- `predicted_rul_hours`: Estimated remaining operational hours ($\ge 0.0\text{ hours}$)
- `deviations`: Multi-parameter absolute, relative, and tolerance-normalized residuals

### Mission Operational Parameters
- `mission_duration_hours`: Planned mission duration (e.g., $1.0 - 24.0\text{ hours}$)
- `altitude`: Planned cruise / operating density altitude ($0 - 8000\text{ m}$)
- `ambient_temperature`: Operating ambient atmospheric temperature ($-20^\circ\text{C} - 50^\circ\text{C}$)
- `throttle`: Average commanded throttle setting ($0 - 100\%$)
- `flight_phase`: Planned or active mission segment (`GROUND`, `TAKEOFF`, `CLIMB`, `CRUISE`, `DESCENT`, `LANDING`)

---

## 3. Mission Reliability Score

The **Mission Reliability Score** ($0.0 - 100.0$) estimates the probability that the engine can sustain the planned mission without experiencing an in-flight shutdown or severe performance degradation.

### Mathematical Formulation
$$\text{Reliability} = \sum_{i=1}^6 w_i \cdot S_i$$

Where all sub-scores $S_i$ are normalized to $[0.0, 100.0]$:
1. **Engine Health ($S_{\text{health}}$)**: $w_1 = 0.30$ (Physical condition)
2. **Engine Fitness ($S_{\text{fitness}}$)**: $w_2 = 0.20$ (Dynamic tracking conformity)
3. **RUL Adequacy Score ($S_{\text{rul}}$)**: $w_3 = 0.15$ (Remaining life vs. mission length)
4. **Anomaly Sub-score ($S_{\text{anomaly}} = 100 \times (1 - S_{\text{anom}})$)**: $w_4 = 0.15$
5. **Fault Sub-score ($S_{\text{fault}} = 100 \times (1 - S_{\text{fault\_risk}})$)**: $w_5 = 0.10$
6. **Environmental Stress Sub-score ($S_{\text{env}} = 100 \times (1 - S_{\text{env\_stress}})$)**: $w_6 = 0.10$

Weights sum to $1.0$ and are configurable in `ReliabilityWeights`.

---

## 4. Environmental & Operational Stress

Environmental stress captures atmospheric and operational severity:
$$S_{\text{env}} = 0.30 \cdot S_{\text{power}} + 0.25 \cdot S_{\text{alt}} + 0.25 \cdot S_{\text{temp}} + 0.20 \cdot S_{\text{dur}} \in [0.0, 1.0]$$

- **Altitude Stress ($S_{\text{alt}}$)**: Ramps from $3000\text{ m}$ to $8000\text{ m}$, accounting for thinner air and decreased thermal dissipation.
- **Temperature Stress ($S_{\text{temp}}$)**: Penalizes extreme heat ($> 25^\circ\text{C}$) and extreme cold ($< -10^\circ\text{C}$).
- **Power Stress ($S_{\text{power}}$)**: Penalizes sustained high throttle ($> 70\%$) and high aerodynamic brake load.
- **Duration Stress ($S_{\text{dur}}$)**: Ramps as planned mission length extends from $2.0$ to $12.0\text{ hours}$.

---

## 5. RUL Flight Margin & Adequacy

The decision engine compares predicted remaining operating life against planned mission duration:
$$\text{rul\_margin\_hours} = \max(0.0, \text{predicted\_rul\_hours} - \text{mission\_duration\_hours})$$

Adequacy categorization:
- **`ADEQUATE`**: $\text{RUL} \ge 2.5 \times \text{Duration}$ and $\text{Margin} \ge 20.0\text{ hours}$.
- **`MARGINAL`**: $1.0 \times \text{Duration} \le \text{RUL} < 2.5 \times \text{Duration}$.
- **`INADEQUATE`**: $\text{RUL} < \text{mission\_duration\_hours}$ (engine wear is projected to breach critical thresholds prior to mission completion).

---

## 6. Fault Risk & Anomaly Integration

- **Fault Integration**: The dominant predicted fault class and its posterior probability ($P(\text{fault})$) are weighted by fault criticality:
  - Catastrophic failure modes (`LUBRICATION_PROBLEM`, `MISFIRE`, `COOLING_PROBLEM`) carry severe risk multipliers ($\ge 0.85$).
  - Nuisance failures (`SENSOR_ANOMALY`) carry lower severity weighting ($0.35$).
- **Anomaly Integration**: The normalized anomaly score ($S_{\text{anomaly}} \in [0.0, 1.0]$) directly penalizes reliability. Scores $> 0.60$ trigger elevated risk even if the supervised fault classifier has not reached a definitive diagnosis.

---

## 7. Mission Risk Classification & Escalations

Base risk mapping from reliability score:
- **`LOW`**: $\text{Reliability} \ge 80.0$
- **`MEDIUM`**: $50.0 \le \text{Reliability} < 80.0$
- **`HIGH`**: $\text{Reliability} < 50.0$

### Safety Escalation Rules
To prevent unsafe dispatch under conflicting signals, deterministic escalations override base risk:
1. **Forced `HIGH` Risk**:
   - `rul_adequacy == "INADEQUATE"`
   - `engine_health < 50.0%`
   - High-confidence severe fault ($P(\text{severe fault}) \ge 0.55$)
   - Extreme anomaly score ($\ge 0.88$)
2. **Forced `MEDIUM` Risk**:
   - `rul_adequacy == "MARGINAL"`
   - Noticeable anomaly score ($\ge 0.65$)
   - Non-normal fault predicted ($P \ge 0.40$)
   - Elevated environmental stress ($\ge 0.70$)

---

## 8. Diagnostic Reason Codes

Reason codes provide transparent traceability without requiring human operators to interpret raw regression outputs:

| Reason Code | Trigger Condition |
| :--- | :--- |
| `HIGH_ENGINE_HEALTH` | Engine health $\ge 85\%$ and fitness $\ge 85\%$ with nominal baseline |
| `LOW_ENGINE_HEALTH` | Engine health $< 80\%$ |
| `CRITICAL_ENGINE_HEALTH`| Engine health $< 50\%$ |
| `HIGH_VIBRATION` | Crankcase vibration in WARNING or CRITICAL limits |
| `HIGH_CHT` | Cylinder head temperature in WARNING or CRITICAL limits |
| `HIGH_EGT` | Exhaust gas temperature in WARNING or CRITICAL limits |
| `LOW_OIL_PRESSURE` | Lubrication oil pressure below safe operational thresholds |
| `HIGH_OIL_TEMP` | Sump oil temperature elevated into warning limits |
| `HIGH_ANOMALY` | Unsupervised anomaly score $> 0.60$ |
| `FAULT_PROBABILITY_HIGH`| Non-NORMAL fault probability $> 0.40$ |
| `LOW_RUL_MARGIN` | RUL adequacy is `MARGINAL` |
| `INADEQUATE_RUL` | RUL adequacy is `INADEQUATE` |
| `ADEQUATE_RUL_MARGIN` | RUL adequacy is `ADEQUATE` |
| `HIGH_ENVIRONMENTAL_STRESS` | Environmental stress index $> 0.55$ |
| `HIGH_MISSION_DURATION` | Planned mission duration $\ge 6.0\text{ hours}$ |

---

## 9. Mission Recommendations & Explanations

The final decision output synthesizes a three-state operational recommendation:
- **`SAFE_TO_PROCEED`**: Mission risk is `LOW`, health is healthy, RUL margin is adequate, and no severe anomalies are present.
- **`PROCEED_WITH_CAUTION`**: Mission risk is `MEDIUM`, marginal RUL margin exists, or moderate environmental stress / early anomalies require heightened monitoring.
- **`MISSION_NOT_RECOMMENDED`**: Mission risk is `HIGH`, inadequate RUL exists, critical health degradation is present, or a severe mechanical fault has been detected.

A structured natural-language rationale is dynamically generated explaining exactly which physical and AI factors led to the recommendation.

---

## 10. Limitations

1. **Simulated Decision Support Only**: This engine is designed strictly as a prototype advisory system for synthetic digital twin simulation. It does not replace pilot-in-command (PIC) judgment or certified UAV mission commander procedures.
2. **Deterministic Heuristic Fusion**: Reliability and risk weights are configured based on engineering principles for 4-stroke aero piston engines, but have not undergone formal DO-178C or DO-254 avionics certification.
3. **No Direct Flight Control Authority**: The decision engine outputs informational telemetry objects and recommendations; it contains no flight-control actuators, autopilot bypasses, or autonomous flight termination mechanisms.
