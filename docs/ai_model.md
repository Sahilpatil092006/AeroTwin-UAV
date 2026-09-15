# AeroTwin-UAV: AI Fault Prediction Model Documentation

> **IMPORTANT RESEARCH NOTICE**:
> The model is trained and evaluated on physics-inspired synthetic aero piston engine telemetry created for the AeroTwin-UAV software prototype. It is not certified for operational flight hardware.

---

## 1. Objective

The **AI Fault Prediction Model** provides real-time automated condition assessment and multi-class failure mode classification for aero piston engines (Rotax 914 / 915 iS class) powering MALE Unmanned Aerial Vehicles.

Operating upstream of the digital twin state tracker, the model ingests 13 channels of environmental and propulsion sensor telemetry to classify the current engine operational state into one of six distinct categories.

---

## 2. Target Classes

The classifier distinguishes between nominal health and five operational degradation/failure modes:

1. **`NORMAL`**: Nominal mechanical and thermodynamic equilibrium across all flight regimes.
2. **`INJECTOR_ABNORMALITY`**: Fuel injector clogging or localized lean air-fuel mixture resulting in elevated EGT, restricted fuel flow, and slight rotational instability.
3. **`COOLING_PROBLEM`**: Thermal dissipation degradation (radiator fouling, coolant loss) driving Cylinder Head Temperature (CHT) and oil temperature beyond safe operational redlines.
4. **`LUBRICATION_PROBLEM`**: Oil gallery pressure collapse, scavenge pump loss, or lubricant starvation accompanied by bearing friction and elevated mechanical vibration.
5. **`MISFIRE`**: Cylinder combustion failure or partial ignition loss causing severe cyclic torque imbalance, violent torsional vibration spikes ($8 - 22$ mm/s), and RPM drops.
6. **`SENSOR_ANOMALY`**: Transducer drift, electrical bias, or thermocouple noise localized to a single telemetry channel while physical engine health remains sound.

---

## 3. Telemetry Feature Schema & Target Leakage Prevention

The model uses **13 input features** representing raw observable sensor signals:

| Category | Features | Description |
|---|---|---|
| **Engine Kinematics** | `rpm` | Crankshaft rotational speed (RPM) |
| **Pilot / Autopilot Commands**| `throttle`, `engine_load` | Commanded Throttle Lever Angle (TLA) and thermodynamic load ratio |
| **Environmental Parameters** | `altitude`, `ambient_temperature`, `humidity`, `wind_speed` | Atmospheric flight conditions affecting air density and cooling efficiency |
| **Thermal Telemetry** | `cht`, `egt`, `oil_temperature` | Cylinder head, exhaust gas, and lubrication sump temperatures (°C) |
| **Fluid & Mechanical** | `oil_pressure`, `vibration`, `fuel_flow` | Oil gallery pressure (bar), chassis vibration (mm/s), volumetric fuel rate (L/h) |

### Strict Target Leakage Exclusion
The following variables were **strictly excluded** from model inputs because they represent ground-truth labels or downstream derived prognostic targets:
- `engine_health` (composite structural score)
- `fault_type` (classification target)
- `fault_severity` (ground-truth failure intensity)
- `anomaly_score` (synthetic benchmark target)
- `rul_hours` (prognostic regression target)
- `mission_risk` (risk decision classification)

---

## 4. Modeling Approach: Random Forest Classifier

A multi-class ensemble **Random Forest Classifier** was selected as the robust initial baseline:
- **`n_estimators`**: 200 decision trees
- **`max_depth`**: 22
- **`min_samples_split`**: 4
- **`min_samples_leaf`**: 2
- **`class_weight`**: `'balanced'` (compensates for higher frequency of nominal operational flight samples)
- **`random_state`**: 42 (deterministic reproducibility)

---

## 5. Train / Validation / Test Strategy & Anti-Leakage Audit

To prevent temporal and engine-level data leakage, partitioning was executed strictly by **`engine_id`**:

| Split | Engines Assigned | Rows | Fleet Share |
|---|---|---|---|
| **Train** | 35 virtual engines (`ENG-002`, `ENG-003`, `ENG-006`, ..., `ENG-050`) | 52,500 | 70.0% |
| **Validation** | 7 virtual engines (`ENG-001`, `ENG-013`, `ENG-024`, `ENG-030`, `ENG-042`, `ENG-044`, `ENG-046`) | 10,500 | 14.0% |
| **Test** | 8 virtual engines (`ENG-004`, `ENG-005`, `ENG-010`, `ENG-015`, `ENG-019`, `ENG-029`, `ENG-034`, `ENG-049`) | 12,000 | 16.0% |

**Leakage Audit Result: PASS** ($\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$). The model was evaluated solely on unseen engines.

---

## 6. Evaluation Performance

### Validation Set Performance (`validation.csv` — 10,500 rows)
- **Accuracy**: **88.13%**
- **Macro Average**: Precision: `0.7424` | Recall: `0.8062` | **F1-Score: 0.7571**
- **Weighted Average**: Precision: `0.8419` | Recall: `0.8813` | **F1-Score: 0.8517**

### Final Test Set Performance (`test.csv` — 12,000 rows)
- **Accuracy**: **89.71%**
- **Macro Average**: Precision: `0.9305` | Recall: `0.8588` | **F1-Score: 0.8893**
- **Weighted Average**: Precision: `0.9048` | Recall: `0.8971` | **F1-Score: 0.8953**

### Per-Class Test Breakdown
```text
                      precision    recall  f1-score   support

     COOLING_PROBLEM     0.9922    0.8152    0.8950      1250
INJECTOR_ABNORMALITY     0.9958    0.7953    0.8844      1500
 LUBRICATION_PROBLEM     0.9435    0.8900    0.9160      1500
             MISFIRE     1.0000    0.9607    0.9799      1500
              NORMAL     0.8404    0.9968    0.9120      4750
      SENSOR_ANOMALY     0.8109    0.6947    0.7483      1500

            accuracy                         0.8971     12000
           macro avg     0.9305    0.8588    0.8893     12000
        weighted avg     0.9048    0.8971    0.8953     12000
```

---

## 7. Confusion Matrix Analysis

![Figure 9: Fault Confusion Matrix](file:///d:/AeroTwin-UAV/docs/figures/09_fault_confusion_matrix.png)

- **`MISFIRE`**: Near-perfect precision ($1.000$) and recall ($0.9607$), easily isolated by extreme torsional vibration signals.
- **`NORMAL`**: Very high recall ($0.9968$), ensuring false alarms are minimized during healthy flight phases.
- **`COOLING_PROBLEM` & `INJECTOR_ABNORMALITY`**: Very high precision ($>0.99$), with misclassifications primarily occurring in early micro-degradation states ($severity < 0.15$) where subtle symptoms mimic normal variations.

---

## 8. Feature Importance

![Figure 8: Feature Importance](file:///d:/AeroTwin-UAV/docs/figures/08_fault_feature_importance.png)

| Rank | Telemetry Feature | Relative Gini Importance | Physical Diagnostics Rationale |
|---|---|---|---|
| 1 | **`vibration`** | **0.2241** | Primary discriminator for mechanical friction and misfire torque ripple |
| 2 | **`egt`** | **0.1435** | Crucial indicator for air-fuel mixture abnormalities and lean combustion |
| 3 | **`oil_pressure`** | **0.1409** | Decisive indicator for lubrication pump starvation |
| 4 | **`cht`** | **0.1237** | Immediate signal for radiator fouling and cooling system degradation |
| 5 | **`oil_temperature`** | **0.1177** | Follows severe thermal breakdown and bearing degradation |
| 6 | `fuel_flow` | 0.0538 | Identifies injector flow restrictions |
| 7 | `rpm` | 0.0487 | Identifies engine surge and rotational instability |
| 8 | `engine_load` | 0.0457 | Contextual baseline for power demand |
| 9 | `throttle` | 0.0392 | Operating intent |
| 10 | `altitude` | 0.0229 | Atmospheric pressure and density context |
| 11 | `ambient_temperature`| 0.0163 | Environmental heat sink context |
| 12 | `humidity` | 0.0125 | Air intake moisture |
| 13 | `wind_speed` | 0.0110 | Airspeed and cooling variance |

---

## 9. Model Artifacts & Metadata

- **Serialized Model File**: [`models/fault_classifier.joblib`](file:///d:/AeroTwin-UAV/models/fault_classifier.joblib) (compressed with `joblib`, level 3)
- **Metadata File**: [`models/fault_classifier_metadata.json`](file:///d:/AeroTwin-UAV/models/fault_classifier_metadata.json)
- **Framework Versions**:
  - `scikit-learn`: 1.8.0
  - `joblib`: 1.5.3
  - `numpy`: 2.4.4
  - `pandas`: 3.0.2

---

## 10. Limitations & Assumptions

1. **Synthetic Telemetry Bias**: The model is trained on numerical approximations. In actual aviation hardware, noise is non-stationary, sensor dropout can occur simultaneously across multiple channels, and mechanical vibrations contain complex harmonic orders.
2. **Tabular Horizon**: Random Forest evaluates instantaneous sensor vectors. Temporal recurrent models (e.g., LSTMs or Temporal Convolutional Networks) could further improve classification of early gradual drift.
3. **Operational Scope**: Designed strictly as an algorithmic component of the AeroTwin-UAV software research prototype.
