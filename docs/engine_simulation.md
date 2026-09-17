# AeroTwin-UAV Virtual Aero Piston Engine Simulation

> **SYSTEM CLASSIFICATION: SOFTWARE PROTOTYPE RESEARCH DOCUMENTATION**  
> *"The engine simulator is a physics-inspired software simulation created for the AeroTwin-UAV prototype. It is not a physical engine model, certified flight model, or replacement for real flight-test data."*

---

## 1. Purpose of the Simulator

The **AeroTwin-UAV Engine Simulator** provides a software-only, standalone virtual telemetry source modeling the thermodynamic, rotational, and lubrication characteristics of a Rotax 914/915 iS class turbocharged 4-stroke horizontally-opposed aero piston engine deployed on Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles.

In later integration steps, this module acts as the physical truth layer and telemetry generator that streams real-time state packets into the AeroTwin-UAV Digital Twin, AI inference pipelines (Fault Classifier, Anomaly Detector, RUL Regressor), and 3D mission control dashboard.

---

## 2. Simulation Inputs

The simulation accepts configurable environmental conditions, flight controls, and operational profiles:

| Input Variable | Data Type | Permissible Range | Engineering Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| `rpm_target` | `Optional[float]` | $800 - 6000$ | $\text{RPM}$ | Commanded rotational speed (defaults to throttle-governed RPM) |
| `throttle` | `float` | $0.0 - 100.0$ | $\%$ | Throttle lever position / power lever angle |
| `altitude` | `float` | $0 - 8000$ | $\text{m}$ | Mean Sea Level (MSL) barometric altitude |
| `ambient_temperature` | `float` | $-10.0 - 50.0$ | $^\circ\text{C}$ | Outside ambient air temperature |
| `humidity` | `float` | $0.0 - 100.0$ | $\%$ | Relative ambient atmospheric humidity |
| `wind_speed` | `float` | $0.0 - 25.0$ | $\text{m/s}$ | Relative headwind/crosswind velocity |
| `mission_duration` | `float` | $> 0.0$ | $\text{hours}$ | Scheduled total mission length |
| `flight_phase` | `str` / `FlightPhase` | Supported Enum | - | Active flight profile segment |

---

## 3. Telemetry Outputs

Each discrete simulation step produces a validated `EngineState` containing 19 standardized telemetry and condition channels:

```json
{
  "engine_id": "AERO-001",
  "mission_id": "MSN-001",
  "timestamp": "2026-03-01T06:00:10+00:00",
  "flight_phase": "CRUISE",
  "rpm": 4521.0,
  "throttle": 68.0,
  "altitude": 4500.0,
  "ambient_temperature": 12.0,
  "humidity": 45.0,
  "wind_speed": 6.0,
  "cht": 96.0,
  "egt": 798.0,
  "oil_pressure": 3.73,
  "oil_temperature": 75.0,
  "vibration": 3.31,
  "fuel_flow": 23.5,
  "engine_load": 66.0,
  "degradation": 0.0,
  "fault_type": "NORMAL",
  "fault_severity": 0.0
}
```

---

## 4. Flight Phases

The simulator supports 6 standardized flight phases, each driving realistic aerodynamic load, throttle envelopes, and thermal behaviors:

```text
GROUND  ──►  TAKEOFF  ──►  CLIMB  ──►  CRUISE  ──►  DESCENT  ──►  LANDING
(Idle/Warmup) (Max Power)   (High Load) (Steady State) (Shock Cooling) (Low Idle/Flare)
```

1. **`GROUND`**: Low aerodynamic load ($18 - 25\%$), lower rotational idle speed ($1800 - 2300\text{ RPM}$), warmup thermal profile.
2. **`TAKEOFF`**: Full throttle ($92 - 100\%$), peak brake load ($90 - 98\%$), maximum continuous RPM ($5500 - 5800\text{ RPM}$), high fuel consumption.
3. **`CLIMB`**: High sustained power ($80 - 90\%$ throttle, $75 - 85\%$ load), progressive climb to density altitude.
4. **`CRUISE`**: Steady-state operating equilibrium ($62 - 74\%$ throttle, $58 - 66\%$ load, $4200 - 4600\text{ RPM}$), thermal stabilization.
5. **`DESCENT`**: Low power setting ($30 - 45\%$ throttle, $32 - 42\%$ load), managing engine cooling rate under high airflow.
6. **`LANDING`**: Approach throttle modulation ($18 - 35\%$), low RPM ($2000 - 2700\text{ RPM}$), low landing load ($20 - 30\%$).

---

## 5. Physics-Inspired Relationships

The mathematical formulation reflects physical aeromechanical couplings rather than independent stochastic numbers:

1. **Rotational Dynamics (RPM)**:
   Responds dynamically toward target RPM via a first-order rotational response factor ($k_{\text{rpm}} = \min(1.0, 0.65 \times \Delta t)$), influenced by throttle command, density altitude drag, misfire combustion drop, and small sensor noise.
2. **Cylinder Head Temperature (CHT)**:
   Thermal equilibrium target:
   $$\text{CHT}_{\text{target}} = 65.0 + 0.45 \times T_{\text{amb}} + 52.0 \times \text{Load} + 14.0 \times \text{ThrottleRatio} + \Delta_{\text{deg}}$$
   Dynamic thermal lag ($\tau_{\text{cht}} \approx 0.08$) simulates cylinder metal thermal mass.
3. **Exhaust Gas Temperature (EGT)**:
   Increases directly with combustion load and throttle demand, fluctuating violently during injector abnormalities or misfires.
4. **Lubrication Oil Pressure**:
   Mechanically driven by the engine oil pump:
   $$P_{\text{oil}} = P_{\text{idle}} + 2.4 \left(\frac{\text{RPM}}{\text{RPM}_{\max}}\right) - 0.012 \times \max(0, T_{\text{oil}} - 80) + \Delta P_{\text{lub}}$$
   Oil pressure drops as oil temperature exceeds $80^\circ\text{C}$ due to viscosity thinning, and plunges severely under lubrication failure.
5. **Oil Temperature**:
   High thermal inertia ($\tau_{\text{oil}} \approx 0.05$) reflecting the thermal capacity of the engine oil sump and radiator. Increases with engine load, ambient temperature, and accumulated run time.
6. **Vibration Intensity**:
   Models primary and secondary harmonic unbalance:
   $$\text{Vib} = \text{Vib}_{\text{base}} + 2.2 \left(\frac{\text{RPM}}{\text{RPM}_{\max}}\right)^2 + 0.85 \times \text{Load} + \Delta_{\text{deg}} + \Delta_{\text{fault}}$$
   Non-linear quadratic scaling with crankshaft speed, dramatically elevated by misfires or bearing looseness.
7. **Fuel Flow**:
   Coupled with throttle opening, manifold pressure, and mechanical brake load.

---

## 6. Gradual Engine Degradation

Continuous mechanical degradation is governed by a normalized degradation parameter:
$$\text{degradation} \in [0.0, 1.0]$$

- **$0.00$**: Factory new / fully overhauled healthy engine.
- **$0.25$**: Early degradation (subtle valve/bearing wear, minimal vibration rise).
- **$0.50$**: Moderate degradation (noticeable thermal elevation $+8^\circ\text{C}$ CHT, minor oil pressure loss $-0.25\text{ bar}$).
- **$0.75$**: Severe degradation (significant mechanical vibration, elevated oil temperature, reduced thermal efficiency).
- **$1.00$**: Critical degradation (near-failure threshold, severe wear).

Degradation shifts physical parameters gradually without artificial step discontinuities.

---

## 7. Operational Fault Simulation

The simulator can inject 5 realistic aero engine operational failure modes:

| Fault Mode | Physical Injected Anomaly | Primary Telemetry Signatures |
| :--- | :--- | :--- |
| `NORMAL` | None | Nominal operating values with Gaussian background noise |
| `INJECTOR_ABNORMALITY` | Lean/rich air-fuel mixture imbalance | Elevated/fluctuating EGT, fuel flow starvation, minor RPM instability, slight vibration increase |
| `COOLING_PROBLEM` | Radiator blockage or coolant pump failure | Rapid CHT elevation ($+30 - 60^\circ\text{C}$), oil temperature rise, minor oil pressure drop from thermal thinning |
| `LUBRICATION_PROBLEM` | Oil pump cavitation or oil gallery starvation | Steep oil pressure drop ($-1.5$ to $-2.5\text{ bar}$), oil temp rise, bearing vibration surge |
| `MISFIRE` | Intermittent ignition failure / cylinder misfire | Violent torsional vibration ($+8 - 15\text{ mm/s}$), RPM dips and cyclic jitter, drop in average EGT |
| `SENSOR_ANOMALY` | Transducer / wiring failure on an isolated channel | Dedicated offset/erratic behavior on the chosen sensor (`cht`, `egt`, `oil_pressure`, `vibration`, `fuel_flow`, `rpm`), while the virtual engine remains physically healthy |

---

## 8. Sensor Noise Model

To prevent unnaturally smooth synthetic signals, bounded zero-mean Gaussian noise is applied to each telemetry channel:
$$X_{\text{observed}} = X_{\text{physics}} + \mathcal{N}(0, \sigma_X)$$

- **$\sigma_{\text{RPM}}$**: $10.0\text{ RPM}$
- **$\sigma_{\text{CHT}}$**: $0.5^\circ\text{C}$
- **$\sigma_{\text{EGT}}$**: $2.5^\circ\text{C}$
- **$\sigma_{P_{\text{oil}}}$**: $0.04\text{ bar}$
- **$\sigma_{T_{\text{oil}}}$**: $0.4^\circ\text{C}$
- **$\sigma_{\text{Vib}}$**: $0.15\text{ mm/s}$
- **$\sigma_{\text{FuelFlow}}$**: $0.25\text{ L/h}$

Noise scales dynamically during fault instability (e.g., misfire triggers increased rotational noise).

---

## 9. Mission Simulation

The `run_mission(duration_hours, dt, step_callback)` API simulates complete end-to-end flights:
- Automatically schedules phase transitions based on mission duration.
- Dynamically ramps throttle and density altitude across climb and descent profiles.
- Returns a time-indexed sequence of `EngineState` records.

---

## 10. Reproducibility & Physical Bounds Verification

1. **Deterministic Randomness**: Initializing the simulator with an explicit integer `seed` guarantees bit-for-bit identical telemetry across repeated runs.
2. **Plausibility Clamps**: All telemetry variables are guarded by strict non-negative and aerodynamic bounds (e.g., $\text{RPM} \ge 0$, $\text{CHT} \ge 0$, $\text{Oil Pressure} \ge 0$, finite float check), strictly prohibiting NaN or infinity values.

---

## 11. Prototype Limitations

1. **Single-Cylinder Lumped Parameter Thermal Model**: The simulation calculates bulk cylinder head and oil sump temperatures rather than multi-zone 3D finite element heat transfer across individual cylinder banks.
2. **Empirical Aerodynamic Approximation**: Flight dynamics rely on standard ISA density approximations rather than 6-DOF airframe equations of motion.
3. **No Hardware-in-the-Loop (HIL) Certification**: This simulation is strictly designed for research, AI algorithmic validation, and digital twin prototyping. It is not approved by FAA or EASA for flight training or real-world aircraft dispatch.
