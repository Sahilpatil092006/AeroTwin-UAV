"""
AeroTwin-UAV Core Engine Simulation Module
==========================================
Implements the software-only physics-inspired aero piston engine simulator
for Rotax 914/915 iS class turbocharged 4-stroke engines deployed on MALE UAVs.

Provides:
- Dynamic discrete-time stepping with thermal and rotational inertia
- Continuous mechanical degradation (0.0 to 1.0)
- Physical operational fault injection (cooling, lubrication, misfire, injector, sensor)
- Full mission progression across 6 standardized flight phases
- Reproducibility guarantees through seeded pseudo-random generation
- Strict bounds validation guaranteeing non-negative, finite telemetry

Software-only research prototype.
"""

from typing import Optional, List, Dict, Any, Callable
import datetime
import math
import numpy as np

from backend.app.simulation.parameters import (
    EngineParameters,
    SimulationInputs,
    EngineState
)
from backend.app.simulation.flight_phases import (
    FlightPhase,
    MISSION_PHASE_SEQUENCE,
    get_phase_characteristics
)
from backend.app.simulation.faults import (
    FaultType,
    FaultConfig,
    FaultInjector,
    TelemetryPerturbation
)


class AeroPistonEngineSimulator:
    """
    High-fidelity physics-inspired virtual aero piston engine simulator.
    """

    def __init__(
        self,
        engine_id: str = "AERO-001",
        mission_id: str = "MSN-001",
        seed: Optional[int] = 42,
        degradation: float = 0.0,
        fault_config: Optional[FaultConfig] = None,
        enable_noise: bool = True,
        noise_scale: float = 1.0,
        parameters: Optional[EngineParameters] = None,
        start_time: Optional[datetime.datetime] = None,
        uav_id: str = "UAV-001"
    ):
        self.engine_id = engine_id
        self.mission_id = mission_id
        self.uav_id = uav_id
        self.seed = seed
        self.enable_noise = enable_noise
        self.noise_scale = max(0.0, noise_scale)
        self.params = parameters or EngineParameters()

        # Deterministic random generator for reproducibility
        self.rng = np.random.default_rng(seed)

        # Simulation clock
        self.current_time = start_time or datetime.datetime(2026, 3, 1, 6, 0, 0, tzinfo=datetime.timezone.utc)
        self.step_count = 0
        self.operating_hours = 0.0

        # Health & Fault Configuration
        self.degradation = float(np.clip(degradation, 0.0, 1.0))
        self.fault_config = fault_config or FaultConfig(FaultType.NORMAL, 0.0)

        # Active Inputs
        self.inputs = SimulationInputs()

        # Dynamic State Variables (with thermal inertia memory)
        self._current_rpm = self.params.idle_rpm
        self._current_cht = self.params.nominal_cht_base + 0.45 * self.inputs.ambient_temperature
        self._current_oil_temp = self.params.nominal_oil_temp_base + 0.35 * self.inputs.ambient_temperature

        # Manufacturing biases per engine instance (subtle static variance)
        self._rpm_bias = float(self.rng.uniform(-10.0, 10.0))
        self._cht_bias = float(self.rng.uniform(-2.0, 2.0))
        self._egt_bias = float(self.rng.uniform(-6.0, 6.0))
        self._oil_p_bias = float(self.rng.uniform(-0.10, 0.10))
        self._vib_bias = float(self.rng.uniform(-0.25, 0.25))

    def reset(self, seed: Optional[int] = None) -> None:
        """Resets the simulator state and random generator."""
        if seed is not None:
            self.seed = seed
        self.rng = np.random.default_rng(self.seed)
        self.step_count = 0
        self.operating_hours = 0.0
        self._current_rpm = self.params.idle_rpm
        self._current_cht = self.params.nominal_cht_base + 0.45 * self.inputs.ambient_temperature
        self._current_oil_temp = self.params.nominal_oil_temp_base + 0.35 * self.inputs.ambient_temperature

    def set_inputs(
        self,
        throttle: Optional[float] = None,
        rpm_target: Optional[float] = None,
        altitude: Optional[float] = None,
        ambient_temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        wind_speed: Optional[float] = None,
        flight_phase: Optional[str | FlightPhase] = None,
        mission_duration: Optional[float] = None
    ) -> None:
        """Updates configurable simulation inputs."""
        if throttle is not None:
            self.inputs.throttle = float(throttle)
        if rpm_target is not None:
            self.inputs.rpm_target = float(rpm_target)
        if altitude is not None:
            self.inputs.altitude = float(altitude)
        if ambient_temperature is not None:
            self.inputs.ambient_temperature = float(ambient_temperature)
        if humidity is not None:
            self.inputs.humidity = float(humidity)
        if wind_speed is not None:
            self.inputs.wind_speed = float(wind_speed)
        if flight_phase is not None:
            if isinstance(flight_phase, FlightPhase):
                self.inputs.flight_phase = flight_phase.value
            else:
                self.inputs.flight_phase = str(flight_phase).upper()
        if rpm_target is not None:
            self.inputs.rpm_target = float(rpm_target)
        elif flight_phase is not None:
            # If flight phase changed without explicit manual rpm_target override,
            # clear stale rpm_target so target RPM naturally follows the flight phase profile and throttle dynamics
            self.inputs.rpm_target = None
        if mission_duration is not None:
            self.inputs.mission_duration = float(mission_duration)

        self.inputs.validate()

    def set_degradation(self, degradation: float) -> None:
        """Sets the continuous mechanical degradation level [0.0, 1.0]."""
        self.degradation = float(np.clip(degradation, 0.0, 1.0))

    def inject_fault(
        self,
        fault_type: str | FaultType,
        severity: float = 1.0,
        target_sensor: Optional[str] = None
    ) -> None:
        """Configures and activates an operational fault mode."""
        if isinstance(fault_type, str):
            fault_type = FaultType(fault_type.upper())
        self.fault_config = FaultConfig(
            fault_type=fault_type,
            severity=float(severity),
            target_sensor=target_sensor
        )

    def clear_fault(self) -> None:
        """Restores fault status to normal."""
        self.fault_config = FaultConfig(FaultType.NORMAL, 0.0)

    def _sample_noise(self, sigma: float) -> float:
        """Samples Gaussian noise if noise is enabled."""
        if not self.enable_noise or self.noise_scale <= 0.0:
            return 0.0
        return float(self.rng.normal(0.0, sigma * self.noise_scale))

    def step(self, dt: float = 1.0) -> EngineState:
        """
        Advances the engine simulation by one discrete timestep `dt` (in seconds).
        Updates internal thermal and mechanical states, applies degradation & fault shifts,
        adds bounded sensor noise, and returns a verified EngineState snapshot.
        """
        if dt <= 0.0:
            raise ValueError(f"Timestep dt must be positive, got {dt}")

        self.step_count += 1
        self.operating_hours += (dt / 3600.0)
        self.current_time += datetime.timedelta(seconds=dt)

        # 1. Atmospheric density altitude effect
        altitude = float(np.clip(self.inputs.altitude, 0.0, 8500.0))
        # ISA standard atmosphere temperature lapse (-6.5 °C / 1000m)
        isa_temp = 15.0 - 0.0065 * altitude
        ambient_temp = float(self.inputs.ambient_temperature)
        density_ratio = math.exp(-altitude / 8500.0)

        # 2. Engine load calculation based on flight phase profile & throttle
        phase_char = get_phase_characteristics(self.inputs.flight_phase)
        throttle_pct = float(np.clip(self.inputs.throttle, 0.0, 100.0))
        throttle_ratio = throttle_pct / 100.0

        # Base aerodynamic brake load influenced by throttle and air density
        base_load = (
            (phase_char.base_load_min + (phase_char.base_load_max - phase_char.base_load_min) * throttle_ratio)
            / 100.0
        )
        # Supercharger / turbocharger compensation: density ratio slight load adjustment
        engine_load = float(np.clip(base_load * (1.0 + 0.08 * (1.0 - density_ratio)), 0.05, 1.00))

        # 3. RPM Dynamics
        # If explicit rpm_target is provided, target it; otherwise compute from throttle curve
        if self.inputs.rpm_target is not None:
            target_rpm = self.inputs.rpm_target
        else:
            target_rpm = (
                self.params.idle_rpm +
                throttle_ratio * (self.params.max_takeoff_rpm - self.params.idle_rpm) +
                self._rpm_bias
            )

        # First-order rotational dynamics approaching target RPM
        rpm_response_factor = min(1.0, 0.65 * dt)
        self._current_rpm += (target_rpm - self._current_rpm) * rpm_response_factor
        nominal_rpm = self._current_rpm

        # 4. Fuel Flow (L/h)
        fuel_flow_nominal = (
            self.params.idle_fuel_flow +
            throttle_ratio * 24.5 +
            engine_load * 3.2
        )

        # 5. Thermal Equilibrium Targets & Dynamic Inertia (CHT & Oil Temp)
        cht_target = (
            self.params.nominal_cht_base +
            0.45 * ambient_temp +
            52.0 * engine_load +
            14.0 * throttle_ratio +
            self._cht_bias
        )
        cht_lag = min(1.0, self.params.cht_thermal_lag * dt)
        self._current_cht += (cht_target - self._current_cht) * cht_lag

        oil_temp_target = (
            self.params.nominal_oil_temp_base +
            0.35 * ambient_temp +
            40.0 * engine_load +
            14.0 * (nominal_rpm / self.params.max_takeoff_rpm) +
            0.5 * min(10.0, self.operating_hours)  # gradual warm-up effect
        )
        oil_t_lag = min(1.0, self.params.oil_t_thermal_lag * dt)
        self._current_oil_temp += (oil_temp_target - self._current_oil_temp) * oil_t_lag

        # 6. EGT (Exhaust Gas Temperature)
        egt_nominal = (
            self.params.nominal_egt_base +
            135.0 * engine_load +
            35.0 * throttle_ratio +
            self._egt_bias
        )

        # 7. Oil Pressure (bar)
        # Increases with crankshaft RPM, drops slightly as oil temperature increases and thins
        oil_p_nominal = (
            self.params.idle_oil_pressure +
            2.4 * (nominal_rpm / self.params.max_takeoff_rpm) -
            0.012 * max(0.0, self._current_oil_temp - 80.0) +
            self._oil_p_bias
        )

        # 8. Vibration (mm/s RMS)
        # Non-linear quadratic relationship with rotational speed plus combustion load
        rpm_ratio = nominal_rpm / self.params.max_takeoff_rpm
        vib_nominal = (
            self.params.nominal_vibration_base +
            2.2 * (rpm_ratio ** 2) +
            0.85 * engine_load +
            self._vib_bias
        )

        # 9. Degradation & Fault Perturbations
        deg_pert = FaultInjector.calculate_degradation_effects(self.degradation)
        fault_pert = FaultInjector.calculate_fault_effects(
            self.fault_config,
            self.degradation,
            self.step_count,
            self.rng
        )

        # Combine perturbations
        rpm_total_offset = deg_pert.rpm_offset + fault_pert.rpm_offset
        cht_total_offset = deg_pert.cht_offset + fault_pert.cht_offset
        egt_total_offset = deg_pert.egt_offset + fault_pert.egt_offset
        oil_p_total_offset = deg_pert.oil_pressure_offset + fault_pert.oil_pressure_offset
        oil_t_total_offset = deg_pert.oil_temperature_offset + fault_pert.oil_temperature_offset
        vib_total_offset = deg_pert.vibration_offset + fault_pert.vibration_offset
        fuel_total_offset = deg_pert.fuel_flow_offset + fault_pert.fuel_flow_offset
        load_total_offset = deg_pert.engine_load_offset + fault_pert.engine_load_offset

        # 10. Sensor Noise (Gaussian, scaled by fault instability if applicable)
        rpm_noise = self._sample_noise(self.params.noise_rpm + fault_pert.rpm_noise_boost)
        cht_noise = self._sample_noise(self.params.noise_cht)
        egt_noise = self._sample_noise(self.params.noise_egt + fault_pert.egt_noise_boost)
        oil_p_noise = self._sample_noise(self.params.noise_oil_pressure)
        oil_t_noise = self._sample_noise(self.params.noise_oil_temperature)
        vib_noise = abs(self._sample_noise(self.params.noise_vibration + fault_pert.vibration_noise_boost))
        fuel_noise = self._sample_noise(self.params.noise_fuel_flow)

        # 11. Assemble final observable telemetry
        final_rpm = nominal_rpm + rpm_total_offset + rpm_noise
        final_throttle = throttle_pct
        final_altitude = altitude
        final_ambient_temp = ambient_temp
        final_humidity = float(np.clip(self.inputs.humidity + self._sample_noise(1.0), 0.0, 100.0))
        final_wind_speed = float(np.clip(self.inputs.wind_speed + self._sample_noise(0.5), 0.0, 50.0))

        final_cht = self._current_cht + cht_total_offset + cht_noise
        final_egt = egt_nominal + egt_total_offset + egt_noise
        final_oil_pressure = oil_p_nominal + oil_p_total_offset + oil_p_noise
        final_oil_temp = self._current_oil_temp + oil_t_total_offset + oil_t_noise
        final_vibration = vib_nominal + vib_total_offset + vib_noise
        final_fuel_flow = fuel_flow_nominal + fuel_total_offset + fuel_noise
        final_engine_load = float(np.clip(engine_load + load_total_offset, 0.05, 1.00))

        # 12. Enforce Plausibility / Safety Clamps (>= 0, bounded physically)
        final_rpm = float(np.clip(final_rpm, 0.0, self.params.redline_rpm + 500.0))
        final_cht = float(np.clip(final_cht, 0.0, 300.0))
        final_egt = float(np.clip(final_egt, 0.0, 1100.0))
        final_oil_pressure = float(np.clip(final_oil_pressure, 0.0, 10.0))
        final_oil_temp = float(np.clip(final_oil_temp, 0.0, 200.0))
        final_vibration = float(np.clip(final_vibration, 0.0, 50.0))
        final_fuel_flow = float(np.clip(final_fuel_flow, 0.0, 80.0))
        final_load_pct = round(final_engine_load * 100.0, 1)

        # Format ISO timestamp
        timestamp_str = self.current_time.isoformat()

        state = EngineState(
            engine_id=self.engine_id,
            mission_id=self.mission_id,
            timestamp=timestamp_str,
            flight_phase=self.inputs.flight_phase,
            rpm=round(final_rpm, 1),
            throttle=round(final_throttle, 1),
            altitude=round(final_altitude, 1),
            ambient_temperature=round(final_ambient_temp, 1),
            humidity=round(final_humidity, 1),
            wind_speed=round(final_wind_speed, 1),
            cht=round(final_cht, 1),
            egt=round(final_egt, 1),
            oil_pressure=round(final_oil_pressure, 2),
            oil_temperature=round(final_oil_temp, 1),
            vibration=round(final_vibration, 2),
            fuel_flow=round(final_fuel_flow, 1),
            engine_load=final_load_pct,
            degradation=round(self.degradation, 3),
            fault_type=self.fault_config.fault_type.value,
            fault_severity=round(self.fault_config.severity, 2),
            uav_id=self.uav_id
        )

        # Validate bounds & finite numbers
        state.validate_bounds()
        return state

    def run_mission(
        self,
        duration_hours: float = 1.0,
        dt: float = 1.0,
        step_callback: Optional[Callable[[EngineState], None]] = None
    ) -> List[EngineState]:
        """
        Executes a complete simulated flight mission progressing seamlessly through:
        GROUND -> TAKEOFF -> CLIMB -> CRUISE -> DESCENT -> LANDING.

        Parameters:
            duration_hours: Total mission duration in virtual hours.
            dt: Timestep in seconds between telemetry generation.
            step_callback: Optional callback invoked with each generated EngineState.

        Returns:
            List of generated EngineState snapshots covering the entire mission.
        """
        if duration_hours <= 0.0:
            raise ValueError(f"duration_hours must be positive, got {duration_hours}")

        total_steps = max(len(MISSION_PHASE_SEQUENCE), int((duration_hours * 3600.0) / dt))
        telemetry_log: List[EngineState] = []

        # Allocate step fractions to each phase according to flight phase profiles
        phase_allocations = {}
        allocated_so_far = 0
        for i, phase in enumerate(MISSION_PHASE_SEQUENCE):
            if i == len(MISSION_PHASE_SEQUENCE) - 1:
                # Last phase takes remaining steps to guarantee exact total
                steps_for_phase = total_steps - allocated_so_far
            else:
                char = get_phase_characteristics(phase)
                steps_for_phase = max(1, int(total_steps * char.mission_time_share))
                allocated_so_far += steps_for_phase
            phase_allocations[phase] = steps_for_phase

        # Run through phases sequentially
        for phase in MISSION_PHASE_SEQUENCE:
            n_steps = phase_allocations[phase]
            char = get_phase_characteristics(phase)

            for s in range(n_steps):
                progress = s / max(1, n_steps - 1)

                # Smooth throttle progression within phase envelope
                target_throttle = char.throttle_min + (char.throttle_max - char.throttle_min) * (
                    0.5 + 0.5 * math.sin(progress * math.pi) if phase in [FlightPhase.CRUISE, FlightPhase.CLIMB] else progress
                )

                # Altitude progression
                if phase == FlightPhase.GROUND:
                    target_alt = char.altitude_target_min
                elif phase == FlightPhase.TAKEOFF:
                    target_alt = char.altitude_target_min + progress * (char.altitude_target_max - char.altitude_target_min)
                elif phase == FlightPhase.CLIMB:
                    target_alt = 500.0 + progress * 4000.0
                elif phase == FlightPhase.CRUISE:
                    target_alt = 4500.0 + 30.0 * math.sin(progress * 4.0 * math.pi)
                elif phase == FlightPhase.DESCENT:
                    target_alt = 4500.0 - progress * 4000.0
                elif phase == FlightPhase.LANDING:
                    target_alt = max(0.0, 500.0 * (1.0 - progress))

                # Update inputs for this step
                self.set_inputs(
                    throttle=target_throttle,
                    altitude=target_alt,
                    flight_phase=phase
                )

                # Advance simulation by dt
                state = self.step(dt=dt)
                telemetry_log.append(state)

                if step_callback:
                    step_callback(state)

        return telemetry_log
