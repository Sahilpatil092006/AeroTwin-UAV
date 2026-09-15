# AeroTwin-UAV Remaining Useful Life (RUL) Prediction Model

> **SYSTEM CLASSIFICATION: SOFTWARE PROTOTYPE RESEARCH DOCUMENTATION**  
> *"The RUL model is trained and evaluated on physics-inspired synthetic aero piston engine telemetry generated for the AeroTwin-UAV software prototype."*  
> *"The RUL estimate is decision-support information for the prototype and is not certified for operational aviation use."*

---

## 1. What RUL Means

**Remaining Useful Life (RUL)** is an estimate of the continuous operational time—measured in hours—that an aero piston engine can safely continue to operate before its functional integrity degrades past defined operational safety limits (e.g., severe mechanical wear, excessive cylinder head temperatures, loss of oil pressure, or uncontained structural misfires).

In the AeroTwin-UAV digital twin architecture, RUL is modeled as a continuous target variable:
$$\text{rul\_hours} \in [0.0, 1000.0]$$

Where:
- **$1000.0\text{ hours}$**: Represents a freshly overhauled, pristine virtual aero engine with zero accumulated stress or wear.
- **$\approx 50.0 - 150.0\text{ hours}$**: Represents an engine approaching its maintenance advisory threshold with detectable early-stage mechanical degradation.
- **$\le 10.0\text{ hours}$**: Represents critical imminent end-of-life status requiring immediate engine maintenance shutdown or emergency abort.

---

## 2. Why RUL is Useful for Predictive Maintenance in MALE UAVs

Medium-Altitude Long-Endurance (MALE) UAV missions frequently span 12 to 36 hours over remote, unpopulated, or maritime areas where emergency landing options are severely limited. Traditional scheduled maintenance operates on fixed Time-Between-Overhaul (TBO) intervals (e.g., every 500 or 1000 flight hours).

Predictive maintenance using RUL offers distinct advantages:
1. **Dynamic Condition-Based Dispatching**: Instead of relying solely on flight hours, maintenance teams can assess whether an engine has sufficient remaining life margin to complete an arduous 24-hour surveillance mission.
2. **Early Intervention**: Detects gradual degradation signatures (thermal drift, mechanical vibration accumulation) long before catastrophic inflight shutdowns occur.
3. **Optimized Logistics & Depot Scheduling**: Engine removals, spare parts procurement, and overhaul facility bookings are scheduled based on actual wear, reducing aircraft downtime.
4. **Integration with Digital Twin**: Feeds continuous prognostic data into the engine health index and mission reliability calculators.

---

## 3. Input Telemetry Features

To strictly prevent target leakage, the RUL model observes **only** standard engine operating conditions, flight parameters, and physical sensor telemetry. No downstream synthetic classification labels, severity scores, or health indices are accessible to the model.

| Feature Name | Physical Dimension / Unit | Typical Operating Range | Description / Physical Role |
| :--- | :--- | :--- | :--- |
| `rpm` | Revolutions Per Minute | $1800 - 2750\text{ RPM}$ | Engine crankshaft rotational speed |
| `throttle` | Percentage ($\%$) | $20.0 - 100.0\%$ | Throttle lever command / power demand |
| `altitude` | Meters ($m$) | $0 - 5500\text{ m}$ | UAV pressure altitude |
| `ambient_temperature` | Degrees Celsius ($^\circ\text{C}$) | $-25.0 - 45.0^\circ\text{C}$ | Outside ambient air temperature |
| `humidity` | Percentage ($\%$) | $10.0 - 95.0\%$ | Relative ambient atmospheric humidity |
| `wind_speed` | Meters per second ($m/s$) | $0.0 - 25.0\text{ m/s}$ | Relative atmospheric headwind/crosswind |
| `cht` | Degrees Celsius ($^\circ\text{C}$) | $120.0 - 250.0^\circ\text{C}$ | Cylinder Head Temperature |
| `egt` | Degrees Celsius ($^\circ\text{C}$) | $600.0 - 900.0^\circ\text{C}$ | Exhaust Gas Temperature |
| `oil_pressure` | Pounds per square inch ($\text{PSI}$) | $20.0 - 85.0\text{ PSI}$ | Engine lubrication oil pressure |
| `oil_temperature` | Degrees Celsius ($^\circ\text{C}$) | $60.0 - 140.0^\circ\text{C}$ | Sump/gallery lubricating oil temperature |
| `vibration` | Root-Mean-Square ($\text{mm/s}$) | $1.0 - 18.0\text{ mm/s}$ | Crankcase & structural vibration intensity |
| `fuel_flow` | Liters per hour ($L/h$) | $12.0 - 45.0\text{ L/h}$ | Volumetric fuel consumption rate |
| `engine_load` | Percentage ($\%$) | $25.0 - 100.0\%$ | Calculated aerodynamic and mechanical brake load |

### Forbidden Target Leakage Variables (Excluded)
The following columns exist in the synthetic dataset for ground-truth benchmarking and evaluation, but are **strictly excluded** from model inputs:
- `engine_health` (composite synthetic health score)
- `fault_type` (categorical fault class)
- `fault_severity` (continuous fault progression scale)
- `anomaly_score` (unsupervised anomaly metric)
- `rul_hours` (the ground-truth target)
- `mission_risk` (downstream risk index)

---

## 4. Target Variable

- **Variable**: `rul_hours`
- **Data Type**: Float64 continuous regression target
- **Domain**: $[0.0, 1000.0]$ operating hours
- **Characteristics**: Decreases monotonically as virtual engine operating hours, thermal fatigue, vibration wear, and fault severity accumulate over time.
- **Physical Ground Truth**: Represents the synthetic prototype ground truth established during Step 3 dataset generation.

---

## 5. Model Architecture: Random Forest Regressor

The predictive model employs a **Random Forest Regressor** (`RandomForestRegressor` from `scikit-learn`):

### Why Random Forest for RUL Regression?
1. **Non-Linear Dynamics**: Aero piston engine degradation exhibits non-linear thermal and mechanical thresholds (e.g., oil breakdown accelerating at temperatures $>120^\circ\text{C}$). Decision trees naturally model non-linear boundaries.
2. **Robustness to Multicollinearity**: Correlated telemetry (e.g., CHT, EGT, fuel flow, and engine load) is handled effectively through random feature subsampling.
3. **Resistance to Overfitting**: Ensemble bootstrap aggregation (bagging) averages multiple decorrelated decision trees, preventing the model from fitting individual engine noise.
4. **Direct Feature Importance**: Enables physical interpretability of which sensor parameters drive remaining life degradation.

### Hyperparameter Configuration
- `n_estimators = 200`
- `max_depth = 22`
- `min_samples_split = 4`
- `min_samples_leaf = 2`
- `random_state = 42`
- `n_jobs = -1`

---

## 6. Train / Validation / Test Strategy

To reflect real-world deployment where an AI model must predict the RUL of unseen engines in the fleet, the partition strategy adheres to an **Engine-Level Group Split**:

```
TOTAL FLEET: 50 Virtual Engines (75,000 observations)
├── Train Set:      35 Engines (70%) -> 52,500 rows  (data/synthetic/train.csv)
├── Validation Set:  7 Engines (14%) -> 10,500 rows  (data/synthetic/validation.csv)
└── Test Set:        8 Engines (16%) -> 12,000 rows  (data/synthetic/test.csv)
```

- **Training**: Model parameters are learned exclusively on `train.csv`.
- **Validation**: Used during model development for hyperparameter tuning and early stopping inspection.
- **Test Set**: Completely held-out set of 8 distinct engine serials evaluated once to calculate unbiased generalization metrics.

---

## 7. Data Leakage Prevention

Data leakage is an acute risk in time-series and condition monitoring applications:
1. **Engine Exclusivity**: Standard random k-fold or row-level train-test splits cause rows from the same engine/mission to appear in both train and test partitions, resulting in unrealistically high scores (engine ID memorization).
2. **Exclusivity Audit**:
   $$\text{Train Engines} \cap \text{Val Engines} = \emptyset$$
   $$\text{Train Engines} \cap \text{Test Engines} = \emptyset$$
   $$\text{Val Engines} \cap \text{Test Engines} = \emptyset$$
   This mutual exclusivity was verified in `scripts/train_rul_model.py` and passed with zero overlap.
3. **No Target Leakage**: As noted in Section 3, all downstream synthetic degradation metrics (`engine_health`, `fault_severity`, etc.) were completely purged from input feature tensors.

---

## 8. Evaluation Metrics

Regression performance is evaluated on both Validation and unseen Test partitions using:

1. **Mean Absolute Error (MAE)**:
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$
   Measures average prediction error in concrete physical units (hours).
2. **Root Mean Squared Error (RMSE)**:
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}$$
   Penalizes large prediction outliers.
3. **Coefficient of Determination ($R^2$)**:
   $$R^2 = 1 - \frac{\sum_{i=1}^N (y_i - \hat{y}_i)^2}{\sum_{i=1}^N (y_i - \bar{y})^2}$$
   Measures the proportion of RUL variance explained by telemetry inputs.
4. **Mean Absolute Percentage Error (MAPE) Handling**:
   When actual RUL approaches $0.0\text{ hours}$ (near end-of-life), relative percentage calculations experience division by near-zero, producing explosive or mathematically unstable values. Therefore:
   - MAE, RMSE, and $R^2$ serve as the primary evaluation criteria.
   - MAPE is reported cautiously using safe evaluation (filtered on $y_i > 10.0\text{ hours}$) for informational context only.

---

## 9. Degradation Relationship & Visual Analysis

The synthetic data generation model incorporates physical degradation laws where increasing operating hours, thermal stress (CHT/EGT), and mechanical wear (vibration, oil pressure loss) depress engine health and remaining useful life.

The generated figures illustrate these dynamics:

1. **Figure 13 (`docs/figures/13_rul_actual_vs_predicted.png`)**:
   Scatter plot comparing actual ground-truth RUL against model predicted RUL across the full $[0, 1000]\text{ hour}$ envelope. The tight alignment along the $1:1$ ideal diagonal confirms accurate linear tracking without bias.
2. **Figure 14 (`docs/figures/14_rul_error_distribution.png`)**:
   Histogram of prediction residuals ($e = \hat{y} - y$). The distribution is centered symmetrically around $0.0\text{ hours}$ with narrow variance.
3. **Figure 15 (`docs/figures/15_rul_degradation_relationship.png`)**:
   Four-quadrant scatter analysis confirming that as fault severity, vibration, and CHT rise, RUL decreases systematically across all simulated fault types.
4. **Figure 16 (`docs/figures/16_rul_feature_importance.png`)**:
   Bar chart detailing feature importances. Thermal and mechanical degradation indicators (`vibration`, `cht`, `oil_pressure`, `oil_temperature`) emerge as the dominant predictors of remaining operating hours.

---

## 10. RUL Prediction Sanity Check

Physical RUL cannot be negative. However, unconstrained regression trees may extrapolate slightly below zero when presented with severe multi-sensor anomalies.
- **Sanity Policy**: All raw model predictions are passed through non-negative clipping:
  $$\hat{y}_{\text{final}} = \max(0.0, \hat{y}_{\text{raw}})$$
- This ensures downstream digital twin modules, dashboards, and mission risk algorithms never receive negative operating hours.

---

## 11. Prototype Limitations

1. **Synthetic Telemetry Basis**: All data is produced by mathematical simulations of thermodynamic, mechanical, and aerodynamic principles rather than physical test bench or flight-test loggers.
2. **Simplified Degradation Mechanics**: Real aero piston engines undergo complex metallurgical fatigue, oil chemical acid build-up, and bore wear that require physical oil spectroscopy and acoustic telemetry not modeled here.
3. **No Certification Standing**: This model is built for software research and digital twin demonstration. It must not be deployed in certified avionics or operational flight dispatch without FAA/EASA-compliant validation on physical hardware.
