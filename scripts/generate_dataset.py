#!/usr/bin/env python3
"""
AeroTwin-UAV Synthetic Telemetry Dataset Generator
===================================================
Generates physics-inspired synthetic time-series telemetry for aero piston engines
(Rotax 914 / 915 iS class turbocharged 4-stroke horizontally opposed engines)
deployed on Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles.

IMPORTANT NOTICE:
This dataset is software-synthesized telemetry generated for research and demonstration
of the AeroTwin-UAV digital twin prototype. It is NOT measured flight-test data from
a physical aircraft or engine.

Author: AeroTwin-UAV Architecture Team
"""

import os
import sys
import argparse
import random
import datetime
import numpy as np
import pandas as pd

# Ensure standard UTF-8 console output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


# -----------------------------------------------------------------------------
# Configuration Constants & Domain Definitions
# -----------------------------------------------------------------------------
FLIGHT_PHASES = [
    'GROUND',
    'TAKEOFF',
    'CLIMB',
    'CRUISE',
    'DESCENT',
    'LANDING'
]

FAULT_TYPES = [
    'NORMAL',
    'INJECTOR_ABNORMALITY',
    'COOLING_PROBLEM',
    'LUBRICATION_PROBLEM',
    'MISFIRE',
    'SENSOR_ANOMALY'
]

DATASET_COLUMNS = [
    'engine_id',
    'timestamp',
    'mission_id',
    'flight_phase',
    'rpm',
    'throttle',
    'altitude',
    'ambient_temperature',
    'humidity',
    'wind_speed',
    'cht',
    'egt',
    'oil_pressure',
    'oil_temperature',
    'vibration',
    'fuel_flow',
    'engine_load',
    'engine_health',
    'fault_type',
    'fault_severity',
    'anomaly_score',
    'rul_hours',
    'mission_risk'
]


# -----------------------------------------------------------------------------
# Engine Simulation Generator Class
# -----------------------------------------------------------------------------
class SyntheticEngineTelemetryGenerator:
    """
    Simulates operational missions and multi-channel telemetry streams for a fleet
    of virtual aero piston engines with physics-coupled degradation and fault modes.
    """

    def __init__(
        self,
        num_engines=50,
        missions_per_engine=6,
        steps_per_mission=250,
        seed=42
    ):
        self.num_engines = num_engines
        self.missions_per_engine = missions_per_engine
        self.steps_per_mission = steps_per_mission
        self.seed = seed

        # Set seeds for reproducibility
        random.seed(seed)
        np.random.seed(seed)

    def _assign_engine_profiles(self):
        """
        Assigns primary fault class and initial operating profiles to each engine.
        Ensures balanced representation across normal and fault modes.
        """
        profiles = {}
        fault_classes_pool = (
            ['NORMAL'] * 15 +
            ['INJECTOR_ABNORMALITY'] * 7 +
            ['COOLING_PROBLEM'] * 7 +
            ['LUBRICATION_PROBLEM'] * 7 +
            ['MISFIRE'] * 7 +
            ['SENSOR_ANOMALY'] * 7
        )

        # Shuffle deterministically
        random.shuffle(fault_classes_pool)

        # Pad or trim if num_engines != 50
        while len(fault_classes_pool) < self.num_engines:
            fault_classes_pool.append(random.choice(FAULT_TYPES))
        fault_classes_pool = fault_classes_pool[:self.num_engines]

        for idx in range(self.num_engines):
            eng_id = f"ENG-{idx + 1:03d}"
            primary_fault = fault_classes_pool[idx]

            # Specific sensor channel affected if SENSOR_ANOMALY
            sensor_target = None
            if primary_fault == 'SENSOR_ANOMALY':
                sensor_target = random.choice(['cht', 'egt', 'oil_pressure', 'vibration', 'fuel_flow'])

            # Baseline manufacturing tolerances per engine
            profiles[eng_id] = {
                'primary_fault': primary_fault,
                'sensor_target': sensor_target,
                'rpm_bias': random.uniform(-15.0, 15.0),
                'cht_bias': random.uniform(-2.5, 2.5),
                'egt_bias': random.uniform(-8.0, 8.0),
                'oil_p_bias': random.uniform(-0.15, 0.15),
                'vib_bias': random.uniform(-0.3, 0.3),
                'base_elevation': random.uniform(50.0, 450.0),
                'cruise_altitude': random.uniform(3200.0, 6800.0),
            }

        return profiles

    def generate(self):
        """
        Executes time-series synthesis for all virtual engines across sequential missions.
        """
        engine_profiles = self._assign_engine_profiles()
        all_rows = []

        start_time_base = datetime.datetime(2026, 3, 1, 6, 0, 0, tzinfo=datetime.timezone.utc)

        # Step durations per phase in 250-step mission
        phase_steps = {
            'GROUND': int(self.steps_per_mission * 0.12),    # ~30 steps
            'TAKEOFF': int(self.steps_per_mission * 0.08),   # ~20 steps
            'CLIMB': int(self.steps_per_mission * 0.20),     # ~50 steps
            'CRUISE': int(self.steps_per_mission * 0.36),    # ~90 steps
            'DESCENT': int(self.steps_per_mission * 0.16),   # ~40 steps
            'LANDING': self.steps_per_mission - (
                int(self.steps_per_mission * 0.12) +
                int(self.steps_per_mission * 0.08) +
                int(self.steps_per_mission * 0.20) +
                int(self.steps_per_mission * 0.36) +
                int(self.steps_per_mission * 0.16)
            )  # remaining ~20 steps
        }

        for eng_idx, (eng_id, profile) in enumerate(engine_profiles.items()):
            primary_fault = profile['primary_fault']

            # Engine degradation accumulates across missions
            for msn_idx in range(self.missions_per_engine):
                msn_id = f"MSN-{eng_id[4:]}-{msn_idx + 1:02d}"

                # Mission start timestamp (1 mission per day for spacing)
                mission_time = start_time_base + datetime.timedelta(
                    days=msn_idx * 2 + eng_idx,
                    hours=random.randint(6, 14)
                )

                # Atmospheric conditions for the mission
                ambient_base_temp = random.uniform(5.0, 38.0)
                ambient_humidity = random.uniform(20.0, 85.0)
                ambient_wind = random.uniform(1.0, 18.0)

                # Degradation progression (0.0 to 1.0)
                # Normal engines maintain minimal wear (0.01 - 0.08)
                # Faulty engines experience accelerated degradation progressing across missions
                if primary_fault == 'NORMAL':
                    base_degradation = 0.01 + 0.06 * (msn_idx / max(1, self.missions_per_engine - 1))
                    fault_severity = 0.0
                    current_fault_type = 'NORMAL'
                else:
                    # Fault onset develops across missions
                    # Earlier missions may be early degradation, later missions reach severe/critical
                    onset_ratio = (msn_idx + 1) / self.missions_per_engine
                    if onset_ratio < 0.35:
                        base_degradation = random.uniform(0.05, 0.22)
                        fault_severity = random.uniform(0.08, 0.25)
                        current_fault_type = primary_fault if random.random() > 0.3 else 'NORMAL'
                    elif onset_ratio < 0.70:
                        base_degradation = random.uniform(0.25, 0.58)
                        fault_severity = random.uniform(0.28, 0.62)
                        current_fault_type = primary_fault
                    else:
                        base_degradation = random.uniform(0.60, 0.98)
                        fault_severity = random.uniform(0.65, 0.98)
                        current_fault_type = primary_fault

                # Smooth thermal state memory
                prev_cht = 75.0 + ambient_base_temp * 0.4
                prev_oil_t = 65.0 + ambient_base_temp * 0.3

                for phase in FLIGHT_PHASES:
                    n_steps = phase_steps[phase]

                    for s in range(n_steps):
                        step_progress = s / max(1, n_steps - 1)
                        current_timestamp = mission_time + datetime.timedelta(seconds=len(all_rows) % 100000)

                        # -------------------------------------------------------------
                        # Phase Operating Dynamics
                        # -------------------------------------------------------------
                        if phase == 'GROUND':
                            throttle = random.uniform(0.12, 0.22)
                            altitude = profile['base_elevation'] + random.uniform(-2.0, 5.0)
                            base_load = 0.18 + throttle * 0.15
                        elif phase == 'TAKEOFF':
                            throttle = random.uniform(0.94, 1.00)
                            altitude = profile['base_elevation'] + step_progress * 450.0
                            base_load = 0.92 + step_progress * 0.06
                        elif phase == 'CLIMB':
                            throttle = random.uniform(0.82, 0.90)
                            altitude = profile['base_elevation'] + 450.0 + step_progress * (profile['cruise_altitude'] - 450.0)
                            base_load = 0.80 + random.uniform(-0.03, 0.04)
                        elif phase == 'CRUISE':
                            throttle = random.uniform(0.64, 0.74)
                            altitude = profile['cruise_altitude'] + random.uniform(-25.0, 30.0)
                            base_load = 0.62 + random.uniform(-0.02, 0.03)
                        elif phase == 'DESCENT':
                            throttle = random.uniform(0.32, 0.44)
                            altitude = profile['cruise_altitude'] - step_progress * (profile['cruise_altitude'] - profile['base_elevation'] - 200.0)
                            base_load = 0.35 + random.uniform(-0.03, 0.03)
                        elif phase == 'LANDING':
                            throttle = random.uniform(0.18, 0.32)
                            altitude = profile['base_elevation'] + max(0.0, (1.0 - step_progress) * 200.0)
                            base_load = 0.22 + random.uniform(-0.03, 0.04)

                        altitude = float(np.clip(altitude, 0.0, 8000.0))

                        # Environmental calculations
                        isa_temp = 15.0 - 0.0065 * altitude
                        temp_offset = ambient_base_temp - 15.0
                        ambient_temp = float(np.clip(isa_temp + temp_offset + random.gauss(0, 0.5), -10.0, 50.0))
                        humidity = float(np.clip(ambient_humidity + random.gauss(0, 1.5), 0.0, 100.0))
                        wind_speed = float(np.clip(ambient_wind + random.gauss(0, 0.8), 0.0, 25.0))

                        # Altitude density effect on engine load
                        density_ratio = np.exp(-altitude / 8500.0)
                        engine_load = float(np.clip(base_load * (1.0 + 0.08 * (1.0 - density_ratio)), 0.05, 1.00))

                        # -------------------------------------------------------------
                        # Primary Parameter Calculations (Physics Baseline)
                        # -------------------------------------------------------------
                        # RPM: 1900 idle, 5800 max continuous
                        rpm_nominal = 1900.0 + throttle * 3800.0 + profile['rpm_bias']
                        rpm_noise = random.gauss(0, 12.0)
                        rpm = rpm_nominal + rpm_noise

                        # Fuel Flow: 5 L/h idle to 32 L/h takeoff
                        fuel_flow_nominal = 4.8 + throttle * 24.5 + engine_load * 3.2
                        fuel_flow = fuel_flow_nominal + random.gauss(0, 0.35)

                        # CHT: 90 - 135 °C nominal
                        cht_target = (
                            62.0 +
                            0.45 * ambient_temp +
                            48.0 * engine_load +
                            12.0 * throttle +
                            profile['cht_bias']
                        )
                        prev_cht = 0.92 * prev_cht + 0.08 * cht_target
                        cht = prev_cht + random.gauss(0, 0.6)

                        # EGT: 700 - 880 °C nominal
                        egt_nominal = (
                            680.0 +
                            130.0 * engine_load +
                            35.0 * throttle +
                            profile['egt_bias']
                        )
                        egt = egt_nominal + random.gauss(0, 3.2)

                        # Oil Temperature: 75 - 110 °C nominal
                        oil_t_target = (
                            52.0 +
                            0.35 * ambient_temp +
                            38.0 * engine_load +
                            12.0 * (rpm / 5800.0)
                        )
                        prev_oil_t = 0.94 * prev_oil_t + 0.06 * oil_t_target
                        oil_temperature = prev_oil_t + random.gauss(0, 0.5)

                        # Oil Pressure: 2.0 - 5.0 bar nominal
                        oil_p_nominal = (
                            2.1 +
                            2.4 * (rpm / 5800.0) -
                            0.010 * max(0.0, oil_temperature - 80.0) +
                            profile['oil_p_bias']
                        )
                        oil_pressure = oil_p_nominal + random.gauss(0, 0.05)

                        # Vibration: 1.8 - 5.5 mm/s nominal
                        vib_nominal = (
                            1.6 +
                            2.2 * ((rpm / 5800.0) ** 2) +
                            0.8 * engine_load +
                            profile['vib_bias']
                        )
                        vibration = vib_nominal + abs(random.gauss(0, 0.22))

                        # -------------------------------------------------------------
                        # Fault Mode Physical Injections
                        # -------------------------------------------------------------
                        degradation = base_degradation
                        sev = fault_severity

                        if current_fault_type == 'INJECTOR_ABNORMALITY':
                            # Abnormal fuel flow, elevated/fluctuating EGT, minor RPM instability
                            egt += (65.0 * sev + 40.0 * degradation) + random.gauss(0, 15.0 * sev)
                            fuel_flow -= (4.5 * sev)
                            rpm += random.gauss(0, 35.0 * sev)
                            vibration += (1.8 * sev + 1.2 * degradation)
                            cht += (8.0 * sev)

                        elif current_fault_type == 'COOLING_PROBLEM':
                            # CHT climbs substantially, oil temp rises
                            cht += (38.0 * sev + 24.0 * degradation)
                            oil_temperature += (18.0 * sev + 12.0 * degradation)
                            oil_pressure -= (0.35 * sev)  # Viscosity drops under extreme heat

                        elif current_fault_type == 'LUBRICATION_PROBLEM':
                            # Oil pressure drops severely, oil temp climbs, vibration increases
                            oil_pressure -= (1.6 * sev + 0.8 * degradation)
                            oil_temperature += (22.0 * sev + 14.0 * degradation)
                            vibration += (3.5 * sev + 2.5 * degradation)
                            rpm -= (45.0 * sev)

                        elif current_fault_type == 'MISFIRE':
                            # Heavy torsional vibration, RPM dips and jitter, erratic EGT
                            vibration += (8.5 * sev + 4.0 * degradation) + abs(random.gauss(0, 2.5 * sev))
                            rpm -= (110.0 * sev) + random.gauss(0, 60.0 * sev)
                            egt -= (60.0 * sev) + random.gauss(0, 30.0 * sev)
                            engine_load = float(np.clip(engine_load + random.gauss(0, 0.06 * sev), 0.05, 1.0))

                        elif current_fault_type == 'SENSOR_ANOMALY':
                            # ONLY one isolated sensor channel shows abnormal readings
                            # The engine itself remains mechanically healthy
                            target_sensor = profile['sensor_target']
                            if target_sensor == 'cht':
                                cht += (55.0 * sev)  # Sensor offset
                            elif target_sensor == 'egt':
                                egt += (140.0 * sev) if s % 2 == 0 else - (120.0 * sev)  # Thermocouple erratic
                            elif target_sensor == 'oil_pressure':
                                oil_pressure -= (1.4 * sev)  # Pressure transducer drift
                            elif target_sensor == 'vibration':
                                vibration += (9.0 * sev)  # Accelerometer cable noise
                            elif target_sensor == 'fuel_flow':
                                fuel_flow += (9.0 * sev)  # Flow meter bias

                        # -------------------------------------------------------------
                        # Physical Plausibility Clamping
                        # -------------------------------------------------------------
                        rpm = float(np.clip(rpm, 1200.0, 6200.0))
                        cht = float(np.clip(cht, 40.0, 210.0))
                        egt = float(np.clip(egt, 350.0, 1020.0))
                        oil_pressure = float(np.clip(oil_pressure, 0.4, 6.5))
                        oil_temperature = float(np.clip(oil_temperature, 30.0, 155.0))
                        vibration = float(np.clip(vibration, 0.5, 30.0))
                        fuel_flow = float(np.clip(fuel_flow, 2.0, 42.0))

                        # -------------------------------------------------------------
                        # Health, Anomaly Score, RUL, and Mission Risk Synthesis
                        # -------------------------------------------------------------
                        if current_fault_type == 'NORMAL':
                            engine_health = 100.0 - (12.0 * degradation) - abs(random.gauss(0, 1.2))
                            anomaly_score = 0.02 + 0.08 * degradation + abs(random.gauss(0, 0.015))
                            rul_hours = 1000.0 - (degradation * 200.0) - (msn_idx * 25.0) + random.gauss(0, 8.0)
                        elif current_fault_type == 'SENSOR_ANOMALY':
                            # Mechanical health remains relatively high, but anomaly score is elevated
                            engine_health = 92.0 - (15.0 * degradation) - (8.0 * sev) - abs(random.gauss(0, 1.5))
                            anomaly_score = 0.25 + 0.55 * sev + abs(random.gauss(0, 0.03))
                            rul_hours = 920.0 - (degradation * 250.0) - (msn_idx * 25.0) + random.gauss(0, 12.0)
                        else:
                            # Mechanical fault drops health substantially
                            health_drop = (55.0 * degradation * sev) + (22.0 * sev) + (14.0 * degradation)
                            engine_health = 100.0 - health_drop - abs(random.gauss(0, 1.5))
                            anomaly_score = 0.20 + 0.65 * sev + 0.12 * degradation + abs(random.gauss(0, 0.02))
                            rul_hours = 1000.0 * (1.0 - 0.75 * degradation - 0.20 * sev) - (msn_idx * 25.0) + random.gauss(0, 10.0)

                        engine_health = float(np.clip(engine_health, 0.0, 100.0))
                        anomaly_score = float(np.clip(anomaly_score, 0.0, 1.0))
                        rul_hours = float(np.clip(rul_hours, 0.0, 1000.0))

                        # Mission Risk derived from health, severity, and environmental stress
                        risk_score = (100.0 - engine_health) * 0.55 + sev * 35.0 + (1.0 - rul_hours / 1000.0) * 10.0
                        if ambient_temp > 40.0 or altitude > 6500.0:
                            risk_score += 8.0

                        if risk_score < 35.0:
                            mission_risk = 'LOW'
                        elif risk_score < 68.0:
                            mission_risk = 'MEDIUM'
                        else:
                            mission_risk = 'HIGH'

                        # Build row dict matching specified columns
                        all_rows.append({
                            'engine_id': eng_id,
                            'timestamp': current_timestamp.strftime('%Y-%m-%dT%H:%M:%SZ'),
                            'mission_id': msn_id,
                            'flight_phase': phase,
                            'rpm': round(rpm, 1),
                            'throttle': round(throttle, 3),
                            'altitude': round(altitude, 1),
                            'ambient_temperature': round(ambient_temp, 1),
                            'humidity': round(humidity, 1),
                            'wind_speed': round(wind_speed, 1),
                            'cht': round(cht, 1),
                            'egt': round(egt, 1),
                            'oil_pressure': round(oil_pressure, 2),
                            'oil_temperature': round(oil_temperature, 1),
                            'vibration': round(vibration, 2),
                            'fuel_flow': round(fuel_flow, 2),
                            'engine_load': round(engine_load, 3),
                            'engine_health': round(engine_health, 1),
                            'fault_type': current_fault_type,
                            'fault_severity': round(sev, 3),
                            'anomaly_score': round(anomaly_score, 3),
                            'rul_hours': round(rul_hours, 1),
                            'mission_risk': mission_risk
                        })

        df = pd.DataFrame(all_rows, columns=DATASET_COLUMNS)
        return df


# -----------------------------------------------------------------------------
# Train / Validation / Test Splitting by Engine ID
# -----------------------------------------------------------------------------
def split_by_engine_id(df, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=42):
    """
    Splits telemetry by unique engine_id to eliminate data leakage between
    time-series samples of the same engine.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Split ratios must sum to 1.0"

    random.seed(seed)
    unique_engines = sorted(df['engine_id'].unique().tolist())
    n_total = len(unique_engines)

    # Group engines by their primary fault mode to perform stratified partition
    engine_fault_map = df.groupby('engine_id')['fault_type'].agg(
        lambda s: s[s != 'NORMAL'].iloc[0] if (s != 'NORMAL').any() else 'NORMAL'
    ).to_dict()

    fault_groups = {}
    for eng_id, fault in engine_fault_map.items():
        fault_groups.setdefault(fault, []).append(eng_id)

    train_engines = []
    val_engines = []
    test_engines = []

    for fault, eng_list in fault_groups.items():
        random.shuffle(eng_list)
        n_eng = len(eng_list)
        n_train = max(1, int(round(n_eng * train_ratio)))
        n_val = max(1, int(round(n_eng * val_ratio))) if n_eng > 2 else (1 if n_eng == 2 else 0)
        
        # Ensure we do not exceed total
        if n_train + n_val >= n_eng:
            n_train = max(1, n_eng - 2) if n_eng >= 3 else 1
            n_val = 1 if n_eng >= 2 else 0

        train_part = eng_list[:n_train]
        remaining = eng_list[n_train:]
        val_part = remaining[:n_val]
        test_part = remaining[n_val:]

        train_engines.extend(train_part)
        val_engines.extend(val_part)
        test_engines.extend(test_part)

    # Adjust to hit exact desired counts if needed
    target_train_count = int(round(n_total * train_ratio))
    target_val_count = int(round(n_total * val_ratio))
    target_test_count = n_total - target_train_count - target_val_count

    all_allocated = train_engines + val_engines + test_engines
    assert len(all_allocated) == n_total, f"Mismatch in engine count: {len(all_allocated)} vs {n_total}"
    assert len(set(all_allocated)) == n_total, "Duplicate engine allocation detected!"

    train_df = df[df['engine_id'].isin(train_engines)].copy()
    val_df = df[df['engine_id'].isin(val_engines)].copy()
    test_df = df[df['engine_id'].isin(test_engines)].copy()

    return train_df, val_df, test_df, train_engines, val_engines, test_engines


# -----------------------------------------------------------------------------
# Data Validation Suite
# -----------------------------------------------------------------------------
def validate_dataset(df, train_df, val_df, test_df, train_engs, val_engs, test_engs):
    """
    Executes comprehensive physical and relational integrity checks.
    """
    errors = []

    # 1. Missing columns
    for col in DATASET_COLUMNS:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")

    # 2. NaN and Infinite values
    if df.isna().any().any():
        nan_cols = df.columns[df.isna().any()].tolist()
        errors.append(f"Found NaN values in columns: {nan_cols}")

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    if np.isinf(df[numeric_cols]).any().any():
        inf_cols = numeric_cols[np.isinf(df[numeric_cols]).any()].tolist()
        errors.append(f"Found Infinite values in columns: {inf_cols}")

    # 3. Physical boundaries
    if (df['rpm'] < 1000).any() or (df['rpm'] > 6500).any():
        errors.append(f"RPM out of physical range [1000, 6500]: min={df['rpm'].min()}, max={df['rpm'].max()}")

    if (df['cht'] < 20).any() or (df['cht'] > 220).any():
        errors.append(f"CHT out of physical range [20, 220]: min={df['cht'].min()}, max={df['cht'].max()}")

    if (df['egt'] < 200).any() or (df['egt'] > 1050).any():
        errors.append(f"EGT out of physical range [200, 1050]: min={df['egt'].min()}, max={df['egt'].max()}")

    if (df['oil_pressure'] < 0).any():
        errors.append(f"Negative oil pressure detected: min={df['oil_pressure'].min()}")

    if (df['vibration'] < 0).any():
        errors.append(f"Negative vibration detected: min={df['vibration'].min()}")

    if (df['fuel_flow'] < 0).any():
        errors.append(f"Negative fuel flow detected: min={df['fuel_flow'].min()}")

    # 4. Target indicators range
    if (df['engine_health'] < 0).any() or (df['engine_health'] > 100).any():
        errors.append(f"Engine health out of range [0, 100]: min={df['engine_health'].min()}, max={df['engine_health'].max()}")

    if (df['fault_severity'] < 0.0).any() or (df['fault_severity'] > 1.0).any():
        errors.append(f"Fault severity out of range [0.0, 1.0]: min={df['fault_severity'].min()}, max={df['fault_severity'].max()}")

    if (df['anomaly_score'] < 0.0).any() or (df['anomaly_score'] > 1.0).any():
        errors.append(f"Anomaly score out of range [0.0, 1.0]: min={df['anomaly_score'].min()}, max={df['anomaly_score'].max()}")

    if (df['rul_hours'] < 0).any():
        errors.append(f"Negative RUL detected: min={df['rul_hours'].min()}")

    # 5. Categorical valid values
    invalid_phases = set(df['flight_phase']) - set(FLIGHT_PHASES)
    if invalid_phases:
        errors.append(f"Invalid flight phases: {invalid_phases}")

    invalid_faults = set(df['fault_type']) - set(FAULT_TYPES)
    if invalid_faults:
        errors.append(f"Invalid fault types: {invalid_faults}")

    invalid_risks = set(df['mission_risk']) - {'LOW', 'MEDIUM', 'HIGH'}
    if invalid_risks:
        errors.append(f"Invalid mission risks: {invalid_risks}")

    # 6. Partition exclusivity (Zero data leakage)
    t_set = set(train_engs)
    v_set = set(val_engs)
    te_set = set(test_engs)

    if t_set.intersection(v_set):
        errors.append(f"Leakage between Train and Validation: {t_set.intersection(v_set)}")
    if t_set.intersection(te_set):
        errors.append(f"Leakage between Train and Test: {t_set.intersection(te_set)}")
    if v_set.intersection(te_set):
        errors.append(f"Leakage between Validation and Test: {v_set.intersection(te_set)}")

    return len(errors) == 0, errors


# -----------------------------------------------------------------------------
# Main CLI Execution
# -----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="AeroTwin-UAV Synthetic Engine Telemetry Generator"
    )
    parser.add_argument('--num-engines', type=int, default=50, help="Number of virtual engines (default: 50)")
    parser.add_argument('--missions', type=int, default=6, help="Missions per engine (default: 6)")
    parser.add_argument('--steps-per-mission', type=int, default=250, help="Time steps per mission (default: 250)")
    parser.add_argument('--seed', type=int, default=42, help="Random seed for reproducibility (default: 42)")
    parser.add_argument('--output-dir', type=str, default='data/synthetic', help="Output root directory")
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print(" AEROTWIN-UAV: SYNTHETIC TELEMETRY DATASET GENERATOR")
    print("=" * 70)
    print(f"[*] Configuration: {args.num_engines} engines | {args.missions} missions/eng | {args.steps_per_mission} steps/mission")
    print(f"[*] Random Seed:   {args.seed}")
    print(f"[*] Output Dir:    {args.output_dir}")

    # 1. Generate Dataset
    generator = SyntheticEngineTelemetryGenerator(
        num_engines=args.num_engines,
        missions_per_engine=args.missions,
        steps_per_mission=args.steps_per_mission,
        seed=args.seed
    )
    print("\n[*] Synthesizing physics-coupled telemetry...")
    df = generator.generate()
    total_rows = len(df)
    print(f"[OK] Generated {total_rows:,} telemetry records.")

    # 2. Partition by Engine ID (70% Train, 15% Val, 15% Test)
    print("\n[*] Splitting dataset by engine ID (70/15/15)...")
    train_df, val_df, test_df, train_engs, val_engs, test_engs = split_by_engine_id(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        seed=args.seed
    )

    # 3. Validate Dataset
    print("\n[*] Executing data validation checks...")
    is_valid, validation_errors = validate_dataset(
        df, train_df, val_df, test_df, train_engs, val_engs, test_engs
    )

    if not is_valid:
        print("[!] Validation failed with errors:")
        for err in validation_errors:
            print(f"    - {err}")
        sys.exit(1)
    else:
        print("[OK] All validation checks PASSED successfully.")

    # 4. Save Outputs
    raw_dir = os.path.join(args.output_dir, 'raw')
    processed_dir = os.path.join(args.output_dir, 'processed')
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)

    raw_path = os.path.join(raw_dir, 'synthetic_telemetry.csv')
    train_path = os.path.join(args.output_dir, 'train.csv')
    val_path = os.path.join(args.output_dir, 'validation.csv')
    test_path = os.path.join(args.output_dir, 'test.csv')

    print(f"\n[*] Exporting datasets to {args.output_dir}...")
    df.to_csv(raw_path, index=False)
    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)
    print(f"    - Raw Full:       {raw_path} ({len(df):,} rows)")
    print(f"    - Train Split:    {train_path} ({len(train_df):,} rows, {len(train_engs)} engines)")
    print(f"    - Val Split:      {val_path} ({len(val_df):,} rows, {len(val_engs)} engines)")
    print(f"    - Test Split:     {test_path} ({len(test_df):,} rows, {len(test_engs)} engines)")

    # 5. Print Data Analysis Summary
    print("\n" + "=" * 70)
    print(" DATA ANALYSIS SUMMARY")
    print("=" * 70)
    print(f"Total Rows:               {len(df):,}")
    print(f"Number of Engines:        {df['engine_id'].nunique()}")
    print(f"Number of Missions:       {df['mission_id'].nunique()}")
    print(f"Average RUL:              {df['rul_hours'].mean():.1f} hours (Std: {df['rul_hours'].std():.1f})")
    print(f"Average Health:           {df['engine_health'].mean():.1f} (Std: {df['engine_health'].std():.1f})")
    print("-" * 70)
    print("Telemetry Parameter Ranges:")
    print(f"  RPM:                    [{df['rpm'].min():.1f}, {df['rpm'].max():.1f}]")
    print(f"  CHT:                    [{df['cht'].min():.1f}°C, {df['cht'].max():.1f}°C]")
    print(f"  EGT:                    [{df['egt'].min():.1f}°C, {df['egt'].max():.1f}°C]")
    print(f"  Oil Pressure:           [{df['oil_pressure'].min():.2f} bar, {df['oil_pressure'].max():.2f} bar]")
    print(f"  Oil Temperature:        [{df['oil_temperature'].min():.1f}°C, {df['oil_temperature'].max():.1f}°C]")
    print(f"  Vibration:              [{df['vibration'].min():.2f} mm/s, {df['vibration'].max():.2f} mm/s]")
    print(f"  Fuel Flow:              [{df['fuel_flow'].min():.2f} L/h, {df['fuel_flow'].max():.2f} L/h]")
    print("-" * 70)
    print("Fault Class Distribution:")
    for fault, count in df['fault_type'].value_counts().items():
        pct = (count / len(df)) * 100
        print(f"  {fault:<25} {count:>6,} ({pct:>5.1f}%)")
    print("-" * 70)
    print("Health Interpretation Breakdown:")
    healthy_cnt = (df['engine_health'] >= 80).sum()
    warning_cnt = ((df['engine_health'] >= 50) & (df['engine_health'] < 80)).sum()
    critical_cnt = (df['engine_health'] < 50).sum()
    print(f"  HEALTHY (80-100):       {healthy_cnt:>6,} ({(healthy_cnt/len(df))*100:>5.1f}%)")
    print(f"  WARNING (50-79):        {warning_cnt:>6,} ({(warning_cnt/len(df))*100:>5.1f}%)")
    print(f"  CRITICAL (0-49):        {critical_cnt:>6,} ({(critical_cnt/len(df))*100:>5.1f}%)")
    print("-" * 70)
    print("Mission Risk Distribution:")
    for risk, count in df['mission_risk'].value_counts().items():
        pct = (count / len(df)) * 100
        print(f"  {risk:<10}              {count:>6,} ({pct:>5.1f}%)")
    print("-" * 70)
    print("Partition Exclusivity:")
    print(f"  Train Engines ({len(train_engs)}):    {', '.join(sorted(train_engs)[:8])} ...")
    print(f"  Val Engines   ({len(val_engs)}):    {', '.join(sorted(val_engs))}")
    print(f"  Test Engines  ({len(test_engs)}):    {', '.join(sorted(test_engs))}")
    print("=" * 70 + "\n")


if __name__ == '__main__':
    main()
