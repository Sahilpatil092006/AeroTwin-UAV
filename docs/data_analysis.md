# AeroTwin-UAV: Exploratory Data Analysis & Validation Report

> **RESEARCH PROTOTYPE NOTICE**:
> This dataset contains physics-inspired synthetic aero piston engine telemetry generated specifically for the AeroTwin-UAV digital twin software prototype. It does NOT represent measured flight-test data from a physical aircraft or physical test cell.

---

## 1. Executive Summary

This report documents the rigorous exploratory data analysis (EDA), physical consistency verification, and anti-leakage partition validation conducted on the synthetic aero piston engine telemetry fleet (Rotax 914 / 915 iS class). 

The analysis was performed prior to any machine learning model training using `Pandas`, `NumPy`, `Matplotlib`, and `Seaborn`, and is codified in [`notebooks/01_data_analysis.ipynb`](file:///d:/AeroTwin-UAV/notebooks/01_data_analysis.ipynb).

---

## 2. Dataset Size & Partition Topology

The dataset comprises **75,000 observations** across 23 engineered parameters, covering 50 independent virtual engines and 300 simulated flight sorties (6 missions per engine $\times$ 250 operational time-steps).

| Partition | Engine Allocation | Engine Count | Total Rows | Share of Fleet |
|---|---|---|---|---|
| **Training** | `ENG-002`, `ENG-003`, `ENG-006`, ..., `ENG-050` | 35 | 52,500 | 70.0% |
| **Validation** | `ENG-001`, `ENG-013`, `ENG-024`, `ENG-030`, `ENG-042`, `ENG-044`, `ENG-046` | 7 | 10,500 | 14.0% |
| **Testing** | `ENG-004`, `ENG-005`, `ENG-010`, `ENG-015`, `ENG-019`, `ENG-029`, `ENG-034`, `ENG-049` | 8 | 12,000 | 16.0% |
| **Combined Fleet** | All Virtual Units (`ENG-001` to `ENG-050`) | **50** | **75,000** | **100.0%** |

### Zero Data Leakage Verification
- **$\text{Train} \cap \text{Validation} = \emptyset$**
- **$\text{Train} \cap \text{Test} = \emptyset$**
- **$\text{Validation} \cap \text{Test} = \emptyset$**
- Splitting was executed strictly at the **`engine_id`** level. No time-series samples from the same virtual engine cross partition boundaries, ensuring genuine out-of-sample evaluation for upcoming AI models.

---

## 3. Operational Conditions & Fault Distribution

The fleet balances nominal flight profiles with 5 realistic mechanical, thermal, and electrical fault classes:

![Figure 1: Fault Distribution](file:///d:/AeroTwin-UAV/docs/figures/01_fault_distribution.png)

| Operational Condition / Fault Class | Sample Count | Fleet Share | Physical Manifestation |
|---|---|---|---|
| **`NORMAL`** | 28,750 | 38.3% | Nominal thermodynamic equilibrium across all 6 flight regimes |
| **`LUBRICATION_PROBLEM`** | 10,250 | 13.7% | Oil gallery pressure drop ($0.8 - 2.0$ bar), oil heating, mechanical friction |
| **`INJECTOR_ABNORMALITY`** | 9,500 | 12.7% | Lean air-fuel combustion, elevated EGT, restricted fuel flow, RPM surge |
| **`MISFIRE`** | 9,500 | 12.7% | Severe cyclic torque variation, torsional vibration ($8 - 22$ mm/s), RPM jitter |
| **`SENSOR_ANOMALY`** | 8,750 | 11.7% | Isolated sensor channel transducer drift; physical engine health remains sound |
| **`COOLING_PROBLEM`** | 8,250 | 11.0% | Heat dissipation loss, CHT exceeding redline ($140 - 179^\circ\text{C}$), oil heating |

---

## 4. Engine Health & Remaining Useful Life (RUL) Distributions

![Figure 2: Engine Health Distribution](file:///d:/AeroTwin-UAV/docs/figures/02_engine_health_distribution.png)
![Figure 3: RUL Distribution](file:///d:/AeroTwin-UAV/docs/figures/03_rul_distribution.png)

### Health Status Breakdown:
- **HEALTHY ($80 - 100$)**: 44,061 rows (58.7%) — Corresponds to normal engines and early flight stages.
- **WARNING ($50 - 79$)**: 17,179 rows (22.9%) — Moderate degradation or minor fault onset.
- **CRITICAL ($0 - 49$)**: 13,760 rows (18.3%) — Severe component failure or end-of-life condition.
- **Fleet Mean Health**: $78.3 \pm 24.3$

### RUL Characteristics:
- **Range**: $0.0$ to $1000.0$ operating hours
- **Fleet Mean**: $671.1 \pm 309.2$ hours
- Normal engines preserve an average RUL $> 850$ hours, whereas engines suffering severe lubrication or thermal degradation trajectory exhibit RUL values collapsing toward $< 100$ hours.

---

## 5. Major Telemetry Relationships & Physics Coupling

![Figure 4: Telemetry Physical Relationships](file:///d:/AeroTwin-UAV/docs/figures/04_telemetry_relationships.png)

1. **RPM vs CHT & EGT**:
   - In nominal flight phases (`GROUND`, `CRUISE`, `TAKEOFF`), CHT ($90 - 135^\circ\text{C}$) and EGT ($700 - 880^\circ\text{C}$) scale monotonically with engine rotational speed and thermodynamic load.
   - During `TAKEOFF` and sustained `CLIMB`, peak combustion heat generation drives both CHT and EGT toward upper nominal limits.
2. **Oil Pressure vs RPM**:
   - Engine-driven positive displacement oil pumps create a strong positive correlation with RPM ($r = +0.72$).
   - In `LUBRICATION_PROBLEM` instances, oil pressure decouples from RPM, collapsing down to $0.83 - 1.8$ bar regardless of engine speed.
3. **Vibration vs Engine Health**:
   - Healthy engines operate at low baseline vibration ($1.8 - 4.5$ mm/s RMS).
   - In `MISFIRE` and `LUBRICATION_PROBLEM`, torsional chatter spikes vibration to $12.0 - 22.1$ mm/s, demonstrating strong negative correlation with engine health ($r = -0.71$).
4. **Throttle vs Engine Load**:
   - Commanded Throttle Lever Angle (TLA) couples tightly with effective engine load ($r = +0.94$), with altitude density corrections reflecting supercharger / turbocharger boost dynamics.

---

## 6. Correlation Heatmap Analysis

![Figure 5: Correlation Heatmap](file:///d:/AeroTwin-UAV/docs/figures/05_correlation_heatmap.png)

- **`engine_health` vs `fault_severity`**: Strong negative correlation ($r = -0.89$), confirming that degradation modeling directly governs structural health.
- **`engine_health` vs `vibration`**: Strong negative correlation ($r = -0.71$).
- **`engine_load` vs `fuel_flow`**: Strong positive correlation ($r = +0.92$), verifying standard fuel-air stoichiometric scaling.
- **`anomaly_score` vs `fault_severity`**: Strong positive correlation ($r = +0.91$), confirming that the synthetic ground-truth score reliably separates nominal from faulty regimes.

---

## 7. Fault Mode Differential Profiles

![Figure 6: Fault Comparison](file:///d:/AeroTwin-UAV/docs/figures/06_fault_comparison.png)

| Fault Class | Mean RPM | Mean CHT (°C) | Mean EGT (°C) | Mean Oil Press (bar) | Mean Oil Temp (°C) | Mean Vibration (mm/s) | Mean Fuel Flow (L/h) | Mean Health | Mean RUL (hrs) |
|---|---|---|---|---|---|---|---|---|---|
| **`NORMAL`** | 4,289.4 | 104.2 | 788.1 | 3.39 | 88.5 | 3.25 | 18.6 | **98.8** | **948.5** |
| **`COOLING_PROBLEM`** | 4,282.1 | **145.8** | 789.2 | 3.12 | **111.4** | 3.24 | 18.6 | 63.4 | 486.2 |
| **`INJECTOR_ABNORMALITY`** | 4,291.0 | 110.1 | **852.4** | 3.39 | 88.6 | 4.62 | **15.2** | 64.9 | 507.8 |
| **`LUBRICATION_PROBLEM`** | 4,251.2 | 104.3 | 788.5 | **2.01** | **114.7** | **7.41** | 18.5 | 56.8 | 412.3 |
| **`MISFIRE`** | 4,204.6 | 104.1 | 741.0 | 3.35 | 88.4 | **12.58** | 18.4 | 55.4 | 398.7 |
| **`SENSOR_ANOMALY`** | 4,284.1 | 110.8 | 790.3 | 3.21 | 88.7 | 4.31 | 19.8 | **85.2** | **791.4** |

### Key Diagnostic Takeaways:
- **`SENSOR_ANOMALY` Distinction**: Maintains a high average health ($85.2$) and high RUL ($791.4$ hrs) because mechanical subsystems are undamaged. Only the localized transducer reading exhibits isolated variance.
- **Cooling vs Lubrication**: `COOLING_PROBLEM` is uniquely identified by CHT ($145.8^\circ\text{C}$ avg) and oil temperature elevation, whereas `LUBRICATION_PROBLEM` is isolated by low oil pressure ($2.01$ bar avg) combined with high vibration.
- **Misfire Signature**: Exhibits the highest mechanical vibration ($12.58$ mm/s avg, peaking at $22.1$ mm/s) accompanied by slight RPM drops and depressed EGT.

---

## 8. Degradation Progression Across Missions

![Figure 7: Degradation Behavior](file:///d:/AeroTwin-UAV/docs/figures/07_degradation_behavior.png)

Gradual wear progression demonstrates continuous degradation curves rather than abrupt step-function switches:
- Early missions ($0.0 \le \text{severity} < 0.3$): System exhibits subtle symptom emergence, health indices remain in the upper warning zone ($70 - 85$).
- Mid-life progression ($0.3 \le \text{severity} < 0.6$): Telemetry trends diverge noticeably from the physical baseline; CHT, vibration, and thermal residuals expand.
- Late-life critical ($0.6 \le \text{severity} \le 1.0$): Health plunges below $50$, anomaly scores saturate toward $0.85 - 1.0$, and RUL approaches zero.

---

## 9. Comprehensive Data Quality Report

```text
===========================================================================
 AEROTWIN-UAV OFFICIAL DATA QUALITY AUDIT REPORT
===========================================================================
Overall Dataset Status:     PASS
---------------------------------------------------------------------------
Missing Values Check:       PASS (0 missing cells across 75,000 rows)
Duplicate Records Check:    PASS (0 duplicate rows)
Engine Split Leakage:       PASS (0 engine ID overlaps between Train/Val/Test)
Physical Plausibility:      PASS
  - RPM non-negative:       PASS [min: 2,177.5, max: 5,756.3 RPM]
  - Oil Pressure valid:     PASS [min: 0.83, max: 4.69 bar]
  - Vibration non-negative: PASS [min: 1.86, max: 22.08 mm/s]
  - Fuel Flow non-negative: PASS [min: 3.73, max: 33.41 L/h]
  - Health in [0, 100]:     PASS [min: 0.0, max: 100.0]
  - RUL non-negative:       PASS [min: 0.0, max: 1,000.0 hrs]
  - Categorical sets valid: PASS (6 fault types, 6 flight phases, 3 risk levels)
===========================================================================
```

---

## 10. Limitations of Synthetic Data

1. **Approximated Combustion Kinematics**: Cylinder-by-cylinder pressure cycles are modeled via mean effective pressure and first-order thermal inertia, rather than full 3D Computational Fluid Dynamics (CFD) or 1D crank-angle gas dynamics.
2. **Simplified Acoustic & Structural Coupling**: Engine vibration is represented as RMS velocity (mm/s) rather than high-frequency accelerometry FFT spectra.
3. **Idealized Transducer Failure Modes**: Sensor anomalies assume single-point drift or white-noise corruption, whereas real-world avionics sensors can experience intermittent wiring harnesses, ground loops, or EMI ripple.
4. **Scope**: This dataset is intended exclusively for software development, algorithmic benchmarking, and UI digital-twin demonstration of the AeroTwin-UAV prototype. It must not be utilized for certifying real-world flight hardware.
