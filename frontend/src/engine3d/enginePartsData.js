/**
 * AeroTwin-UAV Engine Components Catalog
 * Master definitions for the 28 required visible aero piston engine components
 * (Rotax 914/915 iS Turbocharged Boxer-4 style).
 * Maps parts to functional descriptions, normal engineering operating ranges,
 * 3D anchor locations for leader lines, and live telemetry channel bindings.
 */

export const ENGINE_PARTS = [
  {
    id: 'propeller',
    name: 'Propeller',
    category: 'Propulsion',
    isMajor: true,
    function: '3-blade carbon-composite scimitar propeller converting engine shaft torque into aerodynamic thrust.',
    telemetryKey: 'rpm',
    telemetryLabel: 'Propeller Speed',
    unit: 'RPM',
    nominalMin: 1800,
    nominalMax: 2550,
    warningMax: 2650,
    normalRange: '1,800 - 2,550 RPM',
    color: '#1e293b',
    anchor3D: [0, 1.25, 2.05],
    labelPos3D: [0, 2.3, 2.2],
    explodedOffset: [0, 0, 1.8],
    schematicPos: { x: 50, y: 150 },
  },
  {
    id: 'propeller_hub',
    name: 'Propeller Hub',
    category: 'Propulsion',
    isMajor: true,
    function: 'Precision aluminum hub assembly retaining propeller blades and pitch retention mechanism.',
    telemetryKey: 'vibration',
    telemetryLabel: 'Prop Hub Vibration',
    unit: 'g',
    nominalMin: 0.5,
    nominalMax: 3.5,
    warningMax: 5.0,
    normalRange: '0.5 - 3.5 g',
    color: '#475569',
    anchor3D: [0, 0.1, 1.75],
    labelPos3D: [0, -0.65, 2.1],
    explodedOffset: [0, 0, 1.4],
    schematicPos: { x: 95, y: 150 },
  },
  {
    id: 'reduction_gearbox',
    name: 'Reduction Gearbox',
    category: 'Transmission',
    isMajor: false,
    function: 'Propeller reduction gear box (PRGB) stepped at 2.43:1 ratio with integrated torsional overload clutch.',
    telemetryKey: 'vibration',
    telemetryLabel: 'Gearbox Vibration',
    unit: 'g',
    nominalMin: 0.5,
    nominalMax: 3.5,
    warningMax: 5.0,
    normalRange: 'Ratio 2.43:1 // 0.5 - 3.5 g',
    color: '#64748b',
    anchor3D: [0, 0.1, 1.35],
    labelPos3D: [0, 0.85, 1.45],
    explodedOffset: [0, 0, 1.0],
    schematicPos: { x: 135, y: 150 },
  },
  {
    id: 'crankshaft',
    name: 'Crankshaft',
    category: 'Mechanical Core',
    isMajor: true,
    function: 'Forged chrome-nickel-moly steel 4-throw opposed crankshaft with counterweights, converting piston thrust to rotation.',
    telemetryKey: 'rpm',
    telemetryLabel: 'Engine Speed',
    unit: 'RPM',
    nominalMin: 1800,
    nominalMax: 2550,
    warningMax: 2650,
    normalRange: '1,800 - 2,550 RPM',
    color: '#f8fafc',
    anchor3D: [0, 0.05, 0],
    labelPos3D: [0, 1.05, 0.4],
    explodedOffset: [0, 0, 0],
    schematicPos: { x: 260, y: 150 },
  },
  {
    id: 'crankcase',
    name: 'Crankcase',
    category: 'Structural Core',
    isMajor: true,
    function: 'High-strength aluminum alloy split crankcase with structural stiffening ribs and internal oil gallery conduits.',
    telemetryKey: 'engine_load',
    telemetryLabel: 'Engine Load Factor',
    unit: '%',
    nominalMin: 40,
    nominalMax: 85,
    warningMax: 95,
    normalRange: '40.0 - 85.0 %',
    color: '#475569',
    anchor3D: [0, 0.45, -0.2],
    labelPos3D: [1.3, 1.35, -0.1],
    explodedOffset: [0, 0, 0],
    schematicPos: { x: 260, y: 150 },
  },
  {
    id: 'cylinder_1',
    name: 'Cylinder 1',
    category: 'Combustion Chamber',
    isMajor: true,
    function: 'Forward left-bank opposed combustion cylinder barrel with ceramic Nicasil bore coating.',
    telemetryKey: 'cht',
    telemetryLabel: 'Cylinder 1 CHT',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#64748b',
    anchor3D: [-1.15, 0.05, 0.45],
    labelPos3D: [-2.1, 0.7, 0.6],
    explodedOffset: [-1.2, 0, 0.45],
    schematicPos: { x: 210, y: 80 },
  },
  {
    id: 'cylinder_2',
    name: 'Cylinder 2',
    category: 'Combustion Chamber',
    isMajor: true,
    function: 'Aft left-bank opposed combustion cylinder barrel with ceramic Nicasil bore coating.',
    telemetryKey: 'cht',
    telemetryLabel: 'Cylinder 2 CHT',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#64748b',
    anchor3D: [-1.15, 0.05, -0.45],
    labelPos3D: [-2.1, 0.7, -0.6],
    explodedOffset: [-1.2, 0, -0.45],
    schematicPos: { x: 310, y: 80 },
  },
  {
    id: 'cylinder_3',
    name: 'Cylinder 3',
    category: 'Combustion Chamber',
    isMajor: true,
    function: 'Forward right-bank opposed combustion cylinder barrel with ceramic Nicasil bore coating.',
    telemetryKey: 'cht',
    telemetryLabel: 'Cylinder 3 CHT',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#64748b',
    anchor3D: [1.15, 0.05, 0.45],
    labelPos3D: [2.1, 0.7, 0.6],
    explodedOffset: [1.2, 0, 0.45],
    schematicPos: { x: 210, y: 220 },
  },
  {
    id: 'cylinder_4',
    name: 'Cylinder 4',
    category: 'Combustion Chamber',
    isMajor: true,
    function: 'Aft right-bank opposed combustion cylinder barrel with ceramic Nicasil bore coating.',
    telemetryKey: 'cht',
    telemetryLabel: 'Cylinder 4 CHT',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#64748b',
    anchor3D: [1.15, 0.05, -0.45],
    labelPos3D: [2.1, 0.7, -0.6],
    explodedOffset: [1.2, 0, -0.45],
    schematicPos: { x: 310, y: 220 },
  },
  {
    id: 'cylinder_head',
    name: 'Cylinder Heads',
    category: 'Thermal / Combustion',
    isMajor: true,
    function: 'Cast aluminum cylinder heads with hemispherical combustion chambers, valve guides, and cast rocker covers.',
    telemetryKey: 'cht',
    telemetryLabel: 'Head Temp (CHT)',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#cbd5e1',
    anchor3D: [-1.68, 0.05, 0.45],
    labelPos3D: [-2.35, 0.1, 0],
    explodedOffset: [-1.8, 0, 0],
    schematicPos: { x: 260, y: 45 },
  },
  {
    id: 'piston',
    name: 'Pistons',
    category: 'Mechanical Core',
    isMajor: true,
    function: 'Forged aluminum alloy pistons with compression rings, oil scraper ring, and floating wrist pin reciprocating horizontally.',
    telemetryKey: 'engine_load',
    telemetryLabel: 'Dynamic Piston Load',
    unit: '%',
    nominalMin: 40,
    nominalMax: 85,
    warningMax: 95,
    normalRange: '40.0 - 85.0 %',
    color: '#f1f5f9',
    anchor3D: [-0.95, 0.05, 0.45],
    labelPos3D: [-1.5, -0.65, 0.95],
    explodedOffset: [-0.6, 0, 0],
    schematicPos: { x: 260, y: 110 },
  },
  {
    id: 'connecting_rod',
    name: 'Connecting Rods',
    category: 'Kinematic Link',
    isMajor: true,
    function: 'Forged H-beam connecting rods transferring reciprocating piston forces directly to the crankshaft throws.',
    telemetryKey: 'vibration',
    telemetryLabel: 'Rod Journal Vibration',
    unit: 'g',
    nominalMin: 0.5,
    nominalMax: 3.5,
    warningMax: 5.0,
    normalRange: '0.5 - 3.5 g',
    color: '#cbd5e1',
    anchor3D: [-0.55, 0.05, 0.45],
    labelPos3D: [-0.85, -0.8, 0.3],
    explodedOffset: [-0.4, 0, 0],
    schematicPos: { x: 260, y: 130 },
  },
  {
    id: 'intake_valve',
    name: 'Intake Valves',
    category: 'Valvetrain',
    isMajor: true,
    function: 'Precision poppet intake valves opening during INTAKE stroke (0-180°) to draw in pressurized air/fuel charge.',
    telemetryKey: 'engine_load',
    telemetryLabel: 'Volumetric Efficiency',
    unit: '%',
    nominalMin: 40,
    nominalMax: 85,
    warningMax: 95,
    normalRange: '40.0 - 85.0 %',
    color: '#38bdf8',
    anchor3D: [-1.6, 0.22, 0.6],
    labelPos3D: [-2.3, 1.35, 0.3],
    explodedOffset: [-1.6, 0.3, 0],
    schematicPos: { x: 310, y: 45 },
  },
  {
    id: 'exhaust_valve',
    name: 'Exhaust Valves',
    category: 'Valvetrain',
    isMajor: true,
    function: 'High-temperature nickel-alloy poppet valves opening during EXHAUST stroke (540-720°) to discharge hot combustion gases.',
    telemetryKey: 'egt',
    telemetryLabel: 'Valve Gas Temp',
    unit: '°C',
    nominalMin: 720,
    nominalMax: 840,
    warningMax: 880,
    normalRange: '720.0 - 840.0 °C',
    color: '#ea580c',
    anchor3D: [-1.6, -0.22, 0.3],
    labelPos3D: [-2.3, -0.65, 0.3],
    explodedOffset: [-1.6, -0.3, 0],
    schematicPos: { x: 370, y: 45 },
  },
  {
    id: 'spark_plug',
    name: 'Spark Plugs',
    category: 'Electrical / Ignition',
    isMajor: true,
    function: 'Dual aviation spark plugs per cylinder firing timed high-voltage arc at TDC to trigger the POWER combustion stroke.',
    telemetryKey: 'cht',
    telemetryLabel: 'Electrode Temp (CHT)',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#f87171',
    anchor3D: [-1.65, 0.42, 0.45],
    labelPos3D: [-1.75, 1.45, 0.45],
    explodedOffset: [-1.4, 0.5, 0],
    schematicPos: { x: 175, y: 45 },
  },
  {
    id: 'rocker_arm',
    name: 'Rocker Arms',
    category: 'Valvetrain',
    isMajor: false,
    function: 'Forged rocker arms pivoting on hardened rocker shafts on cylinder heads to actuate the intake and exhaust valves.',
    telemetryKey: 'rpm',
    telemetryLabel: 'Valvetrain Cycle Speed',
    unit: 'RPM',
    nominalMin: 1800,
    nominalMax: 2550,
    warningMax: 2650,
    normalRange: '1,800 - 2,550 RPM',
    color: '#94a3b8',
    anchor3D: [-1.78, 0.28, 0.45],
    labelPos3D: [-2.25, 0.42, 0.4],
    explodedOffset: [-1.8, 0.4, 0],
    schematicPos: { x: 340, y: 30 },
  },
  {
    id: 'pushrod',
    name: 'Pushrods & Tubes',
    category: 'Valvetrain',
    isMajor: false,
    function: 'Lightweight hollow pushrods and sealed aluminum protection tubes transmitting camshaft motion to cylinder head rockers.',
    telemetryKey: 'rpm',
    telemetryLabel: 'Camshaft Timing',
    unit: 'RPM',
    nominalMin: 1800,
    nominalMax: 2550,
    warningMax: 2650,
    normalRange: 'Dual Pushrod Array',
    color: '#64748b',
    anchor3D: [-1.1, -0.28, 0.45],
    labelPos3D: [-1.15, -0.65, 0.35],
    explodedOffset: [-1.0, -0.4, 0],
    schematicPos: { x: 230, y: 35 },
  },
  {
    id: 'intake_manifold',
    name: 'Intake Manifold',
    category: 'Fuel & Air Induction',
    isMajor: true,
    function: 'Tuned intake plenum box with 4 runner tubes routing pressurized induction air-fuel mixture to all 4 cylinder intake ports.',
    telemetryKey: 'fuel_flow',
    telemetryLabel: 'Manifold Fuel/Air Flow',
    unit: 'L/h',
    nominalMin: 18,
    nominalMax: 35,
    warningMax: 42,
    normalRange: '18.0 - 35.0 L/h',
    color: '#0284c7',
    anchor3D: [0, 0.85, 0],
    labelPos3D: [0, 1.75, -0.3],
    explodedOffset: [0, 0.9, 0],
    schematicPos: { x: 350, y: 150 },
  },
  {
    id: 'fuel_injector',
    name: 'Fuel Injectors',
    category: 'Fuel System',
    isMajor: true,
    function: 'Multi-hole high-pressure electronic fuel injectors spraying atomized fuel charge directly at the intake valve throats.',
    telemetryKey: 'fuel_flow',
    telemetryLabel: 'Fuel Flow Rate',
    unit: 'L/h',
    nominalMin: 18,
    nominalMax: 35,
    warningMax: 42,
    normalRange: '18.0 - 35.0 L/h',
    color: '#ef4444',
    anchor3D: [-0.75, 0.52, 0.45],
    labelPos3D: [-0.95, 1.45, -0.2],
    explodedOffset: [-0.4, 0.8, 0.3],
    schematicPos: { x: 330, y: 105 },
  },
  {
    id: 'exhaust_manifold',
    name: 'Exhaust Manifold',
    category: 'Exhaust / Thermal',
    isMajor: true,
    function: 'Tuned 4-into-1 Inconel stainless exhaust header pipes scavenging spent combustion gases to the turbocharger turbine.',
    telemetryKey: 'egt',
    telemetryLabel: 'Exhaust Gas Temp (EGT)',
    unit: '°C',
    nominalMin: 720,
    nominalMax: 840,
    warningMax: 880,
    normalRange: '720.0 - 840.0 °C',
    color: '#b45309',
    anchor3D: [0, -0.65, -0.55],
    labelPos3D: [0, -1.05, -0.65],
    explodedOffset: [0, -1.0, -0.8],
    schematicPos: { x: 410, y: 220 },
  },
  {
    id: 'turbocharger',
    name: 'Turbocharger',
    category: 'Forced Induction',
    isMajor: true,
    function: 'Exhaust-driven turbocharger (compressor + turbine + pneumatic wastegate) providing high-altitude manifold boost.',
    telemetryKey: 'egt',
    telemetryLabel: 'Turbine Temp (EGT)',
    unit: '°C',
    nominalMin: 720,
    nominalMax: 840,
    warningMax: 880,
    normalRange: 'Boost: 1.15 - 1.45 bar',
    color: '#78350f',
    anchor3D: [0, -0.55, -1.65],
    labelPos3D: [0, -0.85, -2.25],
    explodedOffset: [0, -0.8, -1.4],
    schematicPos: { x: 450, y: 180 },
  },
  {
    id: 'turbo_intake',
    name: 'Turbo Intake',
    category: 'Forced Induction',
    isMajor: false,
    function: 'High-flow dynamic air intake duct and compressor inlet scroll delivering ambient filtered air into the turbo impeller.',
    telemetryKey: 'engine_load',
    telemetryLabel: 'Compressor Pressure',
    unit: '%',
    nominalMin: 40,
    nominalMax: 85,
    warningMax: 95,
    normalRange: 'Ambient to 1.4 bar',
    color: '#38bdf8',
    anchor3D: [0.45, -0.35, -1.65],
    labelPos3D: [1.15, -0.15, -1.9],
    explodedOffset: [0.5, -0.4, -1.5],
    schematicPos: { x: 470, y: 140 },
  },
  {
    id: 'turbo_exhaust',
    name: 'Turbo Exhaust',
    category: 'Forced Induction',
    isMajor: false,
    function: 'High-temperature turbine housing inlet flange receiving high-velocity exhaust pulses from the merge collector.',
    telemetryKey: 'egt',
    telemetryLabel: 'Turbine Inlet EGT',
    unit: '°C',
    nominalMin: 720,
    nominalMax: 840,
    warningMax: 880,
    normalRange: '720.0 - 840.0 °C',
    color: '#9a3412',
    anchor3D: [-0.35, -0.65, -1.5],
    labelPos3D: [-0.95, -0.75, -1.8],
    explodedOffset: [-0.4, -0.7, -1.3],
    schematicPos: { x: 450, y: 220 },
  },
  {
    id: 'oil_sump',
    name: 'Oil Sump',
    category: 'Lubrication',
    isMajor: true,
    function: 'Cast aluminum engine bottom oil sump reservoir with cooling fins and magnetic chip detector drain plug.',
    telemetryKey: 'oil_temperature',
    telemetryLabel: 'Sump Oil Temp',
    unit: '°C',
    nominalMin: 75,
    nominalMax: 110,
    warningMax: 125,
    normalRange: '75.0 - 110.0 °C',
    color: '#334155',
    anchor3D: [0, -0.85, 0.1],
    labelPos3D: [0, -1.45, 0.2],
    explodedOffset: [0, -0.9, 0],
    schematicPos: { x: 260, y: 250 },
  },
  {
    id: 'oil_pump',
    name: 'Oil Pump',
    category: 'Lubrication',
    isMajor: false,
    function: 'Engine-driven positive-displacement trochoid gear pump circulating pressurized lubricant to crank journals and valve gear.',
    telemetryKey: 'oil_pressure',
    telemetryLabel: 'Oil System Pressure',
    unit: 'bar',
    nominalMin: 2.0,
    nominalMax: 4.5,
    warningMax: 5.5,
    normalRange: '2.0 - 4.5 bar',
    color: '#ca8a04',
    anchor3D: [0.35, -0.45, 1.05],
    labelPos3D: [0.95, -0.55, 1.1],
    explodedOffset: [0.5, -0.5, 1.0],
    schematicPos: { x: 210, y: 250 },
  },
  {
    id: 'oil_filter',
    name: 'Oil Filter',
    category: 'Lubrication',
    isMajor: true,
    function: 'Full-flow spin-on micro-glass aviation filter canister with integral anti-drainback valve and bypass relief.',
    telemetryKey: 'oil_pressure',
    telemetryLabel: 'Filter Differential P',
    unit: 'bar',
    nominalMin: 2.0,
    nominalMax: 4.5,
    warningMax: 5.5,
    normalRange: '2.0 - 4.5 bar',
    color: '#eab308',
    anchor3D: [0.65, -0.45, 0.75],
    labelPos3D: [1.35, -0.4, 0.75],
    explodedOffset: [0.7, -0.6, 0.6],
    schematicPos: { x: 160, y: 230 },
  },
  {
    id: 'cooling_fins',
    name: 'Cooling Fins',
    category: 'Thermal Management',
    isMajor: true,
    function: 'Annular cooling fin arrays cast around all 4 cylinder barrels for ram-air convective heat dissipation.',
    telemetryKey: 'cht',
    telemetryLabel: 'Fin Thermal State',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: '80.0 - 135.0 °C',
    color: '#cbd5e1',
    anchor3D: [-1.15, 0.45, 0.45],
    labelPos3D: [-1.55, 0.25, 1.25],
    explodedOffset: [-1.0, 0, 0],
    schematicPos: { x: 180, y: 130 },
  },
  {
    id: 'exhaust_outlet',
    name: 'Exhaust Outlet',
    category: 'Exhaust / Thermal',
    isMajor: false,
    function: 'Aero-shaped tailpipe downstream of turbocharger turbine directing spent exhaust gas safely out the nacelle bottom.',
    telemetryKey: 'egt',
    telemetryLabel: 'Tailpipe EGT',
    unit: '°C',
    nominalMin: 650,
    nominalMax: 800,
    warningMax: 850,
    normalRange: '650.0 - 800.0 °C',
    color: '#78350f',
    anchor3D: [0, -0.7, -2.1],
    labelPos3D: [-0.55, -1.15, -2.5],
    explodedOffset: [0, -0.9, -1.8],
    schematicPos: { x: 490, y: 220 },
  },
  {
    id: 'sensor_telemetry',
    name: 'Telemetry Sensor',
    category: 'Avionics & Sensors',
    isMajor: false,
    function: 'Integrated engine sensor transducers monitoring CHT, EGT, oil circuit pressure, and vibration signals.',
    telemetryKey: 'cht',
    telemetryLabel: 'Sensor Telemetry',
    unit: '°C',
    nominalMin: 80,
    nominalMax: 135,
    warningMax: 150,
    normalRange: 'Calibrated Signal Range',
    color: '#38bdf8',
    anchor3D: [0, 0.45, -0.6],
    labelPos3D: [-0.65, 0.75, -0.6],
    explodedOffset: [0, 0.6, -0.6],
    schematicPos: { x: 350, y: 150 },
  },
];

/**
 * Fault mapping definitions for virtual engine AI fault classes.
 * Maps each fault class to:
 * - target: 3D part ID to highlight
 * - componentName: Full component name shown in popup header
 * - leaderLabel: Leader line label attached to engine
 * - label: Popup title / fault text
 * - status: 'FAULT' | 'WARNING' | 'HEALTHY'
 * - explanation: Diagnostic explanation
 */
export const FAULT_TARGET_PARTS = {
  NORMAL: {
    target: null,
    componentName: 'No affected component',
    leaderLabel: 'Engine Normal',
    label: 'No active engine fault',
    status: 'HEALTHY',
    explanation: 'All monitored components are operating within nominal aero engine parameters.',
  },
  SENSOR_ANOMALY: {
    target: 'sensor_telemetry',
    componentName: 'Telemetry Sensor',
    leaderLabel: 'Sensor / Telemetry',
    label: 'Sensor / Telemetry Anomaly',
    status: 'WARNING',
    explanation: 'Telemetry sensor channel exhibits statistical anomaly and residual deviation from physics digital twin model.',
  },
  COOLING_PROBLEM: {
    target: 'cylinder_head',
    componentName: 'Cylinder Heads / Cooling Fins',
    leaderLabel: 'Cylinder Heads / Cooling Fins',
    label: 'Cooling System Degradation',
    status: 'FAULT',
    explanation: 'AI identified thermal dissipation deficit; elevated Cylinder Head Temperature (CHT) exceeds thermodynamic baseline.',
  },
  LUBRICATION_PROBLEM: {
    target: 'oil_sump',
    componentName: 'Oil Pump / Oil Sump',
    leaderLabel: 'Oil Pump / Oil Filter / Oil Sump',
    label: 'Lubrication Problem',
    status: 'FAULT',
    explanation: 'AI detected oil pressure degradation or lubrication circuit breakdown, risking hydrodynamic film collapse.',
  },
  MISFIRE: {
    target: 'spark_plug',
    componentName: 'Spark Plug / Cylinder 2',
    leaderLabel: 'Spark Plug / affected Cylinder',
    label: 'Misfire Detected',
    status: 'FAULT',
    explanation: 'AI detected combustion misfire causing rotational speed drop and elevated torsional vibration.',
  },
  INJECTOR_ABNORMALITY: {
    target: 'fuel_injector',
    componentName: 'Fuel Injector',
    leaderLabel: 'Fuel Injector / Intake System',
    label: 'Fuel Injector Abnormality',
    status: 'FAULT',
    explanation: 'AI detected fuel delivery imbalance or injection timing anomaly on fuel injectors.',
  },
};

/**
 * Resolves the single component ID mapped to the active AI fault or anomaly.
 * Returns null if the engine is operating normally.
 */
export function getActiveFaultedPartId(ai = {}, digitalTwin = {}) {
  const faultClass =
    (ai?.fault_detected && ai?.fault_class && ai.fault_class !== 'NORMAL')
      ? ai.fault_class
      : (ai?.fault_type && ai.fault_type !== 'NORMAL')
      ? ai.fault_type
      : (ai?.predicted_fault && ai.predicted_fault !== 'NORMAL')
      ? ai.predicted_fault
      : null;

  if (faultClass && FAULT_TARGET_PARTS[faultClass]) {
    return FAULT_TARGET_PARTS[faultClass].target;
  }

  // Check if AI anomaly is flagged without a specific fault class.
  const isAnomalous = ai?.anomaly_status === 'ANOMALOUS' || ai?.anomaly_detected === true;
  if (isAnomalous) {
    const deviations = digitalTwin?.deviations || {};
    for (const [key, dev] of Object.entries(deviations)) {
      if (dev?.status === 'CRITICAL') {
        if (key === 'cht') return 'cylinder_head';
        if (key === 'egt') return 'exhaust_manifold';
        if (key === 'oil_pressure' || key === 'oil_temperature') return 'oil_sump';
        if (key === 'vibration') return 'crankshaft';
        if (key === 'fuel_flow') return 'fuel_injector';
        if (key === 'rpm') return 'propeller';
        if (key === 'manifold_pressure') return 'turbocharger';
      }
    }
  }

  return null;
}


/**
 * Computes detailed component fault diagnostics given live telemetry, digital twin & AI state.
 * Highlights ONLY the component mapped to the current AI fault.
 * All other components remain NORMAL.
 * @returns {{
 *   status: 'NORMAL' | 'WARNING' | 'FAULT',
 *   faultType: string,
 *   faultLabel: string,
 *   liveValue: string,
 *   expectedValue: string,
 *   deviation: string,
 *   explanation: string,
 *   isPulsing: boolean
 * }}
 */
export function getComponentFaultDetails(part, telemetry = {}, digitalTwin = {}, ai = {}) {
  if (!part) {
    return {
      status: 'NORMAL',
      faultType: 'NORMAL',
      faultLabel: 'Normal Operation',
      telemetryLabel: 'TELEMETRY',
      liveValue: '--',
      expectedValue: '--',
      deviation: '--',
      explanation: 'Component functioning within nominal aero engine parameters.',
      isPulsing: false,
    };
  }

  const key = part.telemetryKey;
  const val = (key && telemetry) ? telemetry[key] : undefined;
  const deviations = digitalTwin?.deviations || {};
  const dev = key ? deviations[key] : undefined;
  const expectedVal = (key && digitalTwin?.expected_telemetry) ? digitalTwin.expected_telemetry[key] : undefined;
  const unit = part.unit || '';
  const partName = part.name || part.id || 'Component';
  const telemetryLabel = part.telemetryLabel || (key ? String(key).toUpperCase() : 'TELEMETRY');

  const liveValFormatted =
    val !== undefined && val !== null && !isNaN(val)
      ? `${Number(val).toFixed(unit === 'g' || unit === 'bar' ? 2 : 1)} ${unit}`.trim()
      : '--';
  const expectedValFormatted =
    expectedVal !== undefined && expectedVal !== null && !isNaN(expectedVal)
      ? `${Number(expectedVal).toFixed(unit === 'g' || unit === 'bar' ? 2 : 1)} ${unit}`.trim()
      : (part.normalRange ? part.normalRange : '--');
  const deviationFormatted =
    dev?.absolute_deviation !== undefined && dev?.absolute_deviation !== null
      ? `${dev.absolute_deviation > 0 ? '+' : ''}${Number(dev.absolute_deviation).toFixed(1)} ${unit}`.trim()
      : '--';

  const affectedPartId = getActiveFaultedPartId(ai, digitalTwin);

  // If this component is the single affected component mapped to the AI fault
  if (affectedPartId && part.id === affectedPartId) {
    const faultClass =
      (ai?.fault_detected && ai?.fault_class && ai.fault_class !== 'NORMAL')
        ? ai.fault_class
        : (ai?.fault_type && ai.fault_type !== 'NORMAL')
        ? ai.fault_type
        : (ai?.predicted_fault && ai.predicted_fault !== 'NORMAL')
        ? ai.predicted_fault
        : null;

    const faultDef = faultClass && FAULT_TARGET_PARTS[faultClass] ? FAULT_TARGET_PARTS[faultClass] : null;
    const isWarning = faultClass === 'SENSOR_ANOMALY' || faultDef?.status === 'WARNING';
    const isHardFault = !isWarning && faultClass !== 'NORMAL';

    return {
      status: isHardFault ? 'FAULT' : 'WARNING',
      faultType: faultClass || (isHardFault ? 'CRITICAL_FAULT' : 'ANOMALY'),
      faultLabel: faultDef ? faultDef.label : (isHardFault ? `${partName} Fault` : `${partName} Anomaly`),
      componentName: faultDef?.componentName || partName,
      leaderLabel: faultDef?.leaderLabel || partName,
      telemetryLabel,
      liveValue: liveValFormatted,
      expectedValue: expectedValFormatted,
      deviation: deviationFormatted,
      explanation:
        faultDef?.explanation ||
        `AI detected abnormal operational deviation on ${partName}.`,
      isPulsing: isHardFault,
    };
  }

  // All other components remain in normal state
  return {
    status: 'NORMAL',
    faultType: 'NORMAL',
    faultLabel: 'No active engine fault',
    componentName: partName,
    leaderLabel: partName,
    telemetryLabel,
    liveValue: liveValFormatted,
    expectedValue: expectedValFormatted,
    deviation: deviationFormatted,
    explanation: part.function || `${partName} functioning within nominal aero engine parameters.`,
    isPulsing: false,
  };

}

/**
 * Computes component operational status given live telemetry, digital twin & AI state
 * @returns {'HEALTHY' | 'WARNING' | 'CRITICAL'}
 */
export function getComponentStatus(part, telemetry = {}, digitalTwin = {}, ai = {}) {
  if (!part) return 'HEALTHY';
  const details = getComponentFaultDetails(part, telemetry, digitalTwin, ai);
  if (details?.status === 'FAULT') return 'CRITICAL';
  if (details?.status === 'WARNING') return 'WARNING';
  return 'HEALTHY';
}
