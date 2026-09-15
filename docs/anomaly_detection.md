# AeroTwin-UAV: Unsupervised Anomaly Detection System

> **IMPORTANT RESEARCH NOTICE**:
> The anomaly detector is trained and evaluated using physics-inspired synthetic aero piston engine telemetry created for the AeroTwin-UAV software prototype. This is NOT certified aviation safety software.

---

## 1. Why Anomaly Detection is Needed in Aero Propulsion

In Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs), piston engines (such as the Rotax 914 / 915 iS class) undergo prolonged continuous duty cycles under varying atmospheric conditions. While supervised classification can recognize known failure modes (e.g., injector clogs or cooling leaks), real-world flight operations encounter:
- Novel, uncharacterized mechanical failure modes.
- Subtle compound degradations across multiple subsystems simultaneously.
- Sensor calibration drift and environmental extremes that don't fit discrete fault archetypes.

An unsupervised anomaly detection system serves as a first-line defensive surveillance layer, continuously monitoring whether engine telemetry conforms to the multi-dimensional manifold of nominal physical behavior.

---

## 2. Supervised vs. Unsupervised Detection Strategy

| Paradigm | Model in AeroTwin-UAV | Training Data | Primary Purpose | Strengths |
|---|---|---|---|---|
| **Supervised** | Random Forest Classifier (`fault_classifier.joblib`) | Labeled telemetry across all 6 conditions | Categorize failure into known discrete classes (`MISFIRE`, `LUBRICATION`, etc.) | High precision on known failure patterns |
| **Unsupervised** | Isolation Forest (`anomaly_detector.joblib`) | **100% NORMAL operating telemetry only** | Flag deviations from nominal baseline | Detects zero-day, unmodeled, or generic anomalies without requiring fault labels |

---

## 3. Why Isolation Forest is Used

**Isolation Forest** (Liu et al.) relies on two fundamental physical properties of anomalies:
1. They are **few in number** compared to nominal states.
2. They possess attribute values that are **dimensionally distant** from dense clusters.

In an ensemble of random isolation trees (iTrees), anomalous observations require significantly fewer recursive partition splits to be isolated into terminal leaf nodes ($h(x) \ll E(h)$). Unlike distance- or density-based algorithms (e.g., k-NN or Local Outlier Factor), Isolation Forest has an $O(n \log n)$ training complexity and low inference latency ($< 1$ ms), making it suitable for edge telemetry monitoring.

---

## 4. Training Methodology & Target Leakage Prevention

### Training Data Filter
The model was fitted strictly on **`NORMAL` operational records** extracted from `data/synthetic/train.csv`:
- Total Training Records Available: 52,500
- **NORMAL Records Used for Training**: **19,250** (36.7% of training split)
- Validation and Test splits were **never seen** during fitting.

### Feature Selection (13 Channels)
- `rpm`, `throttle`, `altitude`, `ambient_temperature`, `humidity`, `wind_speed`, `cht`, `egt`, `oil_pressure`, `oil_temperature`, `vibration`, `fuel_flow`, `engine_load`.

### Excluded Labels (Target Leakage Prevention)
`engine_health`, `fault_type`, `fault_severity`, `anomaly_score`, `rul_hours`, and `mission_risk` were strictly excluded.

### Data Leakage Audit
Engine partitioning is mutually exclusive ($\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$). The detector was evaluated purely on unseen virtual engines.

---

## 5. Normalized Anomaly Scoring & Decision Rule

Isolation Forest produces an internal raw decision function:
$$\text{df}(x) = \text{score\_samples}(x) - \text{offset}$$

In our pipeline, the decision function is normalized into a continuous engineering score $S(x) \in [0.0, 1.0]$:
$$S(x) = \text{clip}\left(\frac{\text{df}_{\max} - \text{df}(x)}{\text{df}_{\max} - \text{df}_{\min}}, 0.0, 1.0\right)$$
- **$\text{df}_{\max} = +0.1004$**: Upper baseline of deeply normal samples $\implies S(x) \to 0.0$.
- **$\text{df}_{\min} = -0.1352$**: Lower baseline of severe outliers $\implies S(x) \to 1.0$.
- **Classification Rule**:
  - If $\text{df}(x) \ge 0.0$ (`pred == 1`) $\implies$ **`NORMAL`** (Binary 0)
  - If $\text{df}(x) < 0.0$ (`pred == -1`) $\implies$ **`ANOMALY`** (Binary 1)

---

## 6. Evaluation Metrics & Fault-Wise Diagnostics

Evaluated on the out-of-sample Test Fleet (`test.csv` — 8 virtual engines, 12,000 observations):

### Binary Classification Performance
- **Accuracy**: **74.95%**
- **Precision**: **0.7631**
- **Recall**: **0.8488**
- **F1 Score**: **0.8037**
- **Faulty Samples Correctly Flagged as Anomalous**: **84.88%** (out of 7,250 faulty records)
- **Normal Samples Retained as Normal**: **59.79%** (out of 4,750 normal records)

### Fault-Wise Breakdown (Test Fleet)
| Operational Condition | Total Samples | Mean Anomaly Score | Median Anomaly Score | Anomaly Flagging Rate (%) |
|---|---|---|---|---|
| **`NORMAL`** | 4,750 | **0.3881** | **0.3873** | 40.21% |
| **`INJECTOR_ABNORMALITY`** | 1,500 | **0.5871** | **0.5915** | **90.27%** |
| **`COOLING_PROBLEM`** | 1,250 | **0.6441** | **0.6711** | **88.72%** |
| **`LUBRICATION_PROBLEM`** | 1,500 | **0.6590** | **0.6628** | **89.00%** |
| **`MISFIRE`** | 1,500 | **0.5909** | **0.5857** | **90.73%** |
| **`SENSOR_ANOMALY`** | 1,500 | **0.4972** | **0.5167** | **66.33%** |

---

## 7. Diagnostic Visualizations

- **Figure 10: Anomaly Score Distribution** ([`10_anomaly_score_distribution.png`](file:///d:/AeroTwin-UAV/docs/figures/10_anomaly_score_distribution.png)): Demonstrates clear bimodal separation between the normal operating cluster ($0.25 - 0.45$) and severe mechanical/thermal failure trajectories ($0.55 - 0.85$).
- **Figure 11: Anomaly Confusion Matrix** ([`11_anomaly_confusion_matrix.png`](file:///d:/AeroTwin-UAV/docs/figures/11_anomaly_confusion_matrix.png)): Quantifies true normal retention vs true anomaly detection.
- **Figure 12: Anomaly Fault Comparison** ([`12_anomaly_fault_comparison.png`](file:///d:/AeroTwin-UAV/docs/figures/12_anomaly_fault_comparison.png)): Compares mean anomaly scores and detection percentages across all 6 conditions.

---

## 8. Limitations & Edge Cases

1. **Unsupervised False Positive Rate**: Because `contamination='auto'` was used on clean normal data without tuning to an ultra-conservative contamination fraction, approximately 40% of normal points near operating boundary transitions (e.g., initial takeoff throttle burst) fall below the 0 decision boundary. In future steps, adaptive thresholding or percentile-based operational budgeting can tune this false positive rate.
2. **Sensor Anomaly Detection**: `SENSOR_ANOMALY` exhibits an intermediate detection rate (66.3%) because single-sensor drift perturbs only one marginal dimension while the remaining 12 dimensions remain clustered inside the normal manifold.
3. **Operational Context**: This model is a core algorithmic module of the AeroTwin-UAV research digital twin prototype and is not certified for aviation safety-critical flight dispatch.
