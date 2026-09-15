# AeroTwin-UAV: Telemetry Data Dictionary

> **IMPORTANT DISCLAIMER**:
> This dataset is physics-inspired synthetic aero piston engine telemetry generated for the AeroTwin-UAV software prototype. It is not measured flight-test data from physical aircraft or IoT sensors.

---

## 1. Overview

The synthetic telemetry dataset provides high-frequency time-series observations representing the operational states of four-stroke, turbocharged aero piston engines (Rotax 914 / 915 iS class) installed on Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (UAVs).

Each record captures environmental context, flight profile dynamics, mechanical and thermal propulsion telemetry, ground-truth engine health indicators, and synthetic mission risk labels.

---

## 2. Parameter Specifications & Column Definitions

| Column Name | Category | Unit | Data Type | Expected Range | Description |
|---|---|---|---|---|---|
| `engine_id` | Metadata | - | String | `ENG-001` - `ENG-050` | Unique identifier for each virtual aero piston engine unit. |
| `timestamp` | Metadata | ISO-8601 | String | UTC Timestamps | High-rate observation sample timestamp. |
| `mission_id` | Metadata | - | String | `MSN-001-01` etc. | Flight sortie identifier linking sequential operational missions per engine. |
| `flight_phase` | Flight Profile | - | Categorical | `GROUND`, `TAKEOFF`, `CLIMB`, `CRUISE`, `DESCENT`, `LANDING` | Current operational flight regime defining aerodynamic and engine load profiles. |
| `rpm` | Propulsion Telemetry | RPM | Float | `1200.0 - 6200.0` | Crankshaft rotational speed. Nominal idle: 1900 RPM; Max continuous: 5800 RPM. Driven by throttle, load, and mechanical health. |
| `throttle` | Flight Profile | Normalized | Float | `0.000 - 1.000` | Throttle Lever Angle (TLA) commanded by UAV flight computer (0.0 = Idle, 1.0 = Max Takeoff Power). |
| `altitude` | Environmental | m (meters) | Float | `0.0 - 8000.0` | Geometric altitude above mean sea level (MSL). Governs atmospheric density and turbo boost demand. |
| `ambient_temperature` | Environmental | °C | Float | `-10.0 - 50.0` | Free-stream atmospheric static air temperature calculated via ISA lapse rate and weather offsets. |
| `humidity` | Environmental | % | Float | `0.0 - 100.0` | Relative humidity of the ambient air mass. |
| `wind_speed` | Environmental | m/s | Float | `0.0 - 25.0` | Ambient atmospheric wind velocity. |
| `cht` | Thermal Telemetry | °C | Float | `40.0 - 210.0` | Cylinder Head Temperature. Nominal: 90 - 135 °C; Critical redline: 140 °C. Elevated in cooling failures and lean conditions. |
| `egt` | Thermal Telemetry | °C | Float | `350.0 - 1020.0` | Exhaust Gas Temperature. Nominal: 700 - 880 °C. Spikes in lean injector clog; drops/erratic in misfire conditions. |
| `oil_pressure` | Fluid Telemetry | bar | Float | `0.40 - 6.50` | Lubrication oil gallery pressure. Nominal: 2.0 - 5.0 bar; Min safe: 1.5 bar. Drops severely during lubrication failure. |
| `oil_temperature` | Fluid Telemetry | °C | Float | `30.0 - 155.0` | Sump oil temperature. Nominal: 75 - 110 °C. Driven by engine load, ambient heat, and bearing friction. |
| `vibration` | Mechanical Telemetry | mm/s RMS | Float | `0.50 - 30.00` | Engine block root-mean-square vibration velocity. Nominal: 1.5 - 5.5 mm/s. Spikes sharply during misfire or bearing damage. |
| `fuel_flow` | Fluid Telemetry | L/h | Float | `2.00 - 42.00` | Volumetric fuel consumption rate. Driven by throttle, RPM, and air-fuel ratio demand. |
| `engine_load` | Derived Parameter | Normalized | Float | `0.050 - 1.000` | Effective thermodynamic load ratio accounting for throttle, flight phase, density altitude, and aerodynamic drag. |
| `engine_health` | Ground Truth (AI Target) | Score (0-100) | Float | `0.0 - 100.0` | Composite structural and operational engine health index. 80-100: Healthy, 50-79: Warning, 0-49: Critical. |
| `fault_type` | Diagnostic Label | - | Categorical | 6 Classes (see Section 3) | Primary operational condition or injected failure mode. |
| `fault_severity` | Diagnostic Label | Normalized | Float | `0.000 - 1.000` | Intensity of the failure mode. 0.0: Normal; 0.1-0.3: Minor; 0.3-0.6: Moderate; 0.6-0.8: Severe; 0.8-1.0: Critical. |
| `anomaly_score` | Synthetic Ground Truth | Normalized | Float | `0.000 - 1.000` | Normalized anomaly indicator for semi-supervised model benchmarking. High for abnormal conditions. |
| `rul_hours` | Prognostic Target | Hours | Float | `0.0 - 1000.0` | Synthetic ground-truth Remaining Useful Life (RUL) until mandatory engine overhaul or component failure. |
| `mission_risk` | Risk Decision | - | Categorical | `LOW`, `MEDIUM`, `HIGH` | Flight-phase survivability risk classification derived from health, severity, environmental stress, and RUL. |

---

## 3. Injected Fault Modes & Behavioral Modeling

1. **`NORMAL`**:
   - Nominal thermodynamic and mechanical operation with standard sensor Gaussian noise.
   - Fault severity: `0.0`; Engine health: `85 - 100`; Mission risk: `LOW`.
2. **`INJECTOR_ABNORMALITY`**:
   - Represents fuel injector clogging or spray pattern disruption causing localized lean combustion.
   - Effects: Elevated/erratic EGT (+65 to +120 °C), reduced fuel flow, slight RPM fluctuation, minor vibration elevation.
3. **`COOLING_PROBLEM`**:
   - Represents radiator fouling, coolant loss, or thermostatic valve failure.
   - Effects: CHT steadily climbs above safe redline (140 - 180 °C), oil temperature increases (+15 to +35 °C), oil pressure slightly drops due to thermal viscosity breakdown.
4. **`LUBRICATION_PROBLEM`**:
   - Represents oil pump wear, oil leakage, or scavenge failure.
   - Effects: Oil pressure drops into danger territory (0.5 - 1.8 bar), oil temperature spikes, bearing friction causes vibration increase (up to 12 - 18 mm/s).
5. **`MISFIRE`**:
   - Represents partial or intermittent cylinder combustion loss (ignition spark failure or valve blowby).
   - Effects: Severe torsional vibration spikes (8 - 25 mm/s), RPM drop and erratic jitter (±100 - 250 RPM), unburnt mixture causes erratic EGT dips.
6. **`SENSOR_ANOMALY`**:
   - Represents instrumentation or telemetry wiring degradation (transducer drift, open circuit, EMI cable noise).
   - Effects: **Only a single sensor channel** (e.g. CHT, EGT, oil pressure, or vibration) outputs biased or erratic values while all coupled physical parameters remain completely nominal.
   - Mechanical engine health remains high (~80 - 92), training AI models to differentiate sensor faults from actual mechanical engine failures.

---

## 4. Dataset Partitions & Anti-Leakage Strategy

To ensure valid generalization of machine learning models:
- Splitting is performed strictly by `engine_id` (70% Train, 15% Validation, 15% Test).
- No engine appears in more than one partition.
- All 6 fault modes are stratifiably represented in all three splits.
