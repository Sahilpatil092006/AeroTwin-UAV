import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Compass,
  Layers,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Crosshair,
  Info,
  Maximize,
  Minimize,
  Flame,
  Tag,
  Split,
  Play,
  Pause,
  SkipForward,
  Eye,
  Zap,
  Droplet,
  Wind,
  Gauge,
  Sliders,
  CheckCircle2,
  Box,
  FileCode2,
  X,
} from 'lucide-react';
import WebGLErrorBoundary from './WebGLErrorBoundary';
import {
  ENGINE_PARTS,
  getComponentStatus,
  getComponentFaultDetails,
  getActiveFaultedPartId,
} from './enginePartsData';

/**
 * Short names for 3D engine labels:
 * "Propeller", "Cylinders", "Crankshaft", "Oil", "Turbo"
 */
const SHORT_NAMES = {
  propeller: 'Propeller',
  propeller_hub: 'Propeller',
  reduction_gearbox: 'Gearbox',
  crankcase: 'Crankcase',
  crankshaft: 'Crankshaft',
  camshaft: 'Camshaft',
  cylinder_1: 'Cylinders',
  cylinder_2: 'Cylinders',
  cylinder_3: 'Cylinders',
  cylinder_4: 'Cylinders',
  cylinder_head: 'Cylinders',
  piston: 'Cylinders',
  connecting_rod: 'Crankshaft',
  intake_valve: 'Valves',
  exhaust_valve: 'Valves',
  spark_plug: 'Spark Plugs',
  fuel_injector: 'Injectors',
  intake_manifold: 'Intake',
  exhaust_manifold: 'Exhaust',
  exhaust_outlet: 'Turbo',
  turbocharger: 'Turbo',
  turbo_intake: 'Turbo',
  turbo_exhaust: 'Turbo',
  oil_sump: 'Oil',
  oil_pump: 'Oil',
  oil_filter: 'Oil',
  cooling_fins: 'Cylinders',
  wastegate: 'Turbo',
};

/**
 * EXACTLY 5 Major Non-Overlapping Labels for SHOW NAMES
 * Short names: Propeller, Cylinders, Crankshaft, Oil, Turbo
 * Anchored in 5 separate quadrants around engine perimeter.
 */
const MAJOR_FIVE_LABELS = [
  {
    id: 'propeller',
    name: 'Propeller',
    anchor3D: [0, 0.05, 1.3],
    labelPos3D: [-0.45, 0.25, 1.3],
  },
  {
    id: 'cylinder_1',
    name: 'Cylinders',
    anchor3D: [-1.45, 0.05, 0],
    labelPos3D: [-1.85, 0.22, 0],
  },
  {
    id: 'crankshaft',
    name: 'Crankshaft',
    anchor3D: [0, 0.05, 0.1],
    labelPos3D: [0.65, 0.25, 0.1],
  },
  {
    id: 'oil_sump',
    name: 'Oil',
    anchor3D: [0.4, -0.65, 0.4],
    labelPos3D: [0.68, -0.65, 0.4],
  },
  {
    id: 'turbocharger',
    name: 'Turbo',
    anchor3D: [0, -0.55, -1.6],
    labelPos3D: [-0.48, -0.35, -1.6],
  },
];

/**
 * Compact 3D Label Badge
 * - Maximum font-size: 10px
 * - Maximum label height: 22px
 * - Short subtle leader lines
 * - No distanceFactor (maintains true screen pixel size)
 */
function ComponentLeaderLabel({ part, onSelect, isSelected, isFault, isWarning }) {
  const anchor = part.anchor3D || [0, 0, 0];
  const targetPos = useMemo(() => {
    const majorMatch = MAJOR_FIVE_LABELS.find((m) => m.id === part.id);
    if (majorMatch?.labelPos3D) return majorMatch.labelPos3D;

    const [ax, ay, az] = anchor;
    const offsetX = ax < -0.15 ? -0.35 : ax > 0.15 ? 0.35 : -0.5;
    const offsetY = 0.15;
    const offsetZ = 0.02;
    return [ax + offsetX, ay + offsetY, az + offsetZ];
  }, [anchor, part.id]);

  const linePoints = useMemo(() => {
    return [new THREE.Vector3(...anchor), new THREE.Vector3(...targetPos)];
  }, [anchor, targetPos]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(linePoints);
  }, [linePoints]);

  const lineColor = isFault ? 0xef4444 : isWarning ? 0xf59e0b : isSelected ? 0x38bdf8 : 0x64748b;
  const displayName = SHORT_NAMES[part.id] || part.name || 'Component';

  return (
    <group>
      {/* Subtle Anchor Dot on Component */}
      <mesh position={anchor}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={isFault ? '#ef4444' : isWarning ? '#f59e0b' : isSelected ? '#38bdf8' : '#64748b'} />
      </mesh>

      {/* Subtle Short Leader Line */}
      <primitive
        object={
          new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({
              color: lineColor,
              transparent: true,
              opacity: 0.55,
              linewidth: 1,
            })
          )
        }
      />

      {/* Small Compact Badge: Max font-size: 10px, Max height: 22px, No Drei scale-up */}
      <Html position={targetPos} center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(part.id);
          }}
          style={{
            fontSize: '10px',
            lineHeight: '18px',
            maxHeight: '22px',
            height: '20px',
            padding: '0 6px',
            whiteSpace: 'nowrap',
          }}
          className={`rounded font-mono shadow transition-all inline-flex items-center gap-1 cursor-pointer backdrop-blur-md border ${
            isFault
              ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-rose-950/40'
              : isWarning
              ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow-amber-950/40'
              : isSelected
              ? 'bg-sky-950/95 border-sky-400 text-sky-100 ring-1 ring-sky-400/40 font-bold'
              : 'bg-slate-950/90 border-slate-700 text-slate-300 hover:text-white hover:border-sky-400'
          }`}
        >
          <span
            style={{ width: '5px', height: '5px' }}
            className={`rounded-full flex-shrink-0 ${
              isFault ? 'bg-rose-400 animate-pulse' : isWarning ? 'bg-amber-400 animate-pulse' : isSelected ? 'bg-sky-400' : 'bg-slate-400'
            }`}
          />
          <span className="font-semibold">{displayName}</span>
          {isFault && (
            <span
              style={{ fontSize: '8px', lineHeight: '12px', padding: '0 3px' }}
              className="rounded bg-rose-600/40 text-rose-300 font-bold tracking-tight"
            >
              FAULT
            </span>
          )}
          {isWarning && (
            <span
              style={{ fontSize: '8px', lineHeight: '12px', padding: '0 3px' }}
              className="rounded bg-amber-600/40 text-amber-300 font-bold tracking-tight"
            >
              WARN
            </span>
          )}
        </button>
      </Html>
    </group>
  );
}

/**
 * Compact Diagnostic Card docked beside the 3D viewport without covering the engine.
 * Selected component, fault label, component name, telemetry, baseline, deviation,
 * and description all strictly refer to the SAME component.
 */
function CompactDiagnosticCard({ part, faultDetails, onClose }) {
  if (!part || !faultDetails) return null;

  const isFault = faultDetails.status === 'FAULT';
  const isWarning = faultDetails.status === 'WARNING';

  const theme = isFault
    ? {
        border: 'border-rose-500/80',
        badgeBg: 'bg-rose-950/90 border-rose-600 text-rose-300',
        dot: 'bg-rose-400 animate-ping',
        textAccent: 'text-rose-400',
        shadow: 'rgba(244, 63, 94, 0.3)',
      }
    : isWarning
    ? {
        border: 'border-amber-500/80',
        badgeBg: 'bg-amber-950/90 border-amber-600 text-amber-300',
        dot: 'bg-amber-400 animate-pulse',
        textAccent: 'text-amber-400',
        shadow: 'rgba(245, 158, 11, 0.3)',
      }
    : {
        border: 'border-sky-500/70',
        badgeBg: 'bg-emerald-950/90 border-emerald-600 text-emerald-300',
        dot: 'bg-emerald-400',
        textAccent: 'text-sky-300',
        shadow: 'rgba(14, 165, 233, 0.25)',
      };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute top-3 right-3 z-20 w-60 max-w-[250px] bg-slate-950/95 backdrop-blur-md border ${theme.border} rounded-lg p-2.5 text-xs shadow-2xl font-mono text-slate-200 select-text transition-all`}
      style={{
        boxShadow: `0 10px 25px -5px ${theme.shadow}, 0 0 1px 1px rgba(255, 255, 255, 0.05)`,
      }}
    >
      {/* Header: Component Name + Status Badge + Close */}
      <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full ${theme.dot} flex-shrink-0`} />
          <h4 className="font-bold text-slate-100 text-[11px] truncate tracking-wide" title={part.name}>
            {part.name}
          </h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${theme.badgeBg}`}>
            {faultDetails.status}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors"
            title="Close diagnostic card"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Fault / Status Section */}
      <div className="mb-2 p-1.5 rounded bg-slate-900/90 border border-slate-800">
        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
          FAULT / STATUS
        </div>
        <div className={`text-[10px] font-bold ${theme.textAccent} break-words leading-tight`}>
          {faultDetails.faultLabel}
        </div>
      </div>

      {/* Telemetry & Baseline */}
      <div className="mb-2 p-1.5 rounded bg-slate-900/70 border border-slate-800/80 space-y-1 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-[9px] truncate mr-1">{faultDetails.telemetryLabel}:</span>
          <span className="font-bold text-sky-300 flex-shrink-0">{faultDetails.liveValue}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <span>BASELINE:</span>
          <span className="text-slate-300 flex-shrink-0">{faultDetails.expectedValue}</span>
        </div>
        {faultDetails.deviation !== '--' && (
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-400">DEVIATION:</span>
            <span className={`font-bold flex-shrink-0 ${isFault ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
              {faultDetails.deviation}
            </span>
          </div>
        )}
      </div>

      {/* Description / Explanation */}
      <div>
        <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          DIAGNOSTIC EXPLANATION
        </div>
        <p className="text-[9px] text-slate-300 leading-snug bg-slate-900/90 p-1.5 rounded border border-slate-800">
          {faultDetails.explanation}
        </p>
      </div>
    </div>
  );
}

/**
 * Master Kinematic Working Assembly for Rotax 914/915 Boxer-4 Engine
 * Features all 28 distinct procedural components with realistic contrasting materials
 */
function AeroPistonEngineWorkingAssembly({
  selectedPartId,
  activePartId = null,
  onSelectPart,
  selectedCylinder,
  telemetry = {},
  digitalTwin = {},
  ai = {},
  wireframe = false,
  thermalMap = false,
  isCutaway = true,
  exploded = false,
  showNames = false,
  showAirFuel = true,
  showExhaust = true,
  showIgnition = true,
  showOil = true,
  showCooling = true,
  isPlaying = true,
  stepTrigger = 0,
  playbackSpeed = 0.6,
  onCycleUpdate,
}) {
  const groupRef = useRef();
  const crankshaftRef = useRef();
  const propHubRef = useRef();
  const turboShaftRef = useRef();

  // Active fault materials requiring pulse animation
  const faultMaterialsRef = useRef([]);
  faultMaterialsRef.current = [];

  const activePart = activePartId ? ENGINE_PARTS.find((p) => p.id === activePartId) : null;
  const activePartAnchor = activePart ? activePart.anchor3D : null;
  const activeFaultInfo = activePart ? getComponentFaultDetails(activePart, telemetry, digitalTwin, ai) : null;
  const activeAnchorColor = activeFaultInfo?.status === 'FAULT' ? '#ef4444' : activeFaultInfo?.status === 'WARNING' ? '#f59e0b' : '#38bdf8';

  // Piston refs
  const piston1Ref = useRef();
  const piston2Ref = useRef();
  const piston3Ref = useRef();
  const piston4Ref = useRef();

  // Connecting rod refs
  const rod1Ref = useRef();
  const rod2Ref = useRef();
  const rod3Ref = useRef();
  const rod4Ref = useRef();

  // Rocker arm refs
  const rocker1Ref = useRef();
  const rocker2Ref = useRef();
  const rocker3Ref = useRef();
  const rocker4Ref = useRef();

  // Valve refs (linear displacement)
  const inValve1Ref = useRef();
  const exValve1Ref = useRef();
  const inValve2Ref = useRef();
  const exValve2Ref = useRef();
  const inValve3Ref = useRef();
  const exValve3Ref = useRef();
  const inValve4Ref = useRef();
  const exValve4Ref = useRef();

  // Spark & combustion flash refs
  const spark1Ref = useRef();
  const spark2Ref = useRef();
  const spark3Ref = useRef();
  const spark4Ref = useRef();

  // Flow particles refs
  const airFuelFlowRef = useRef();
  const exhaustFlowRef = useRef();
  const oilFlowRef = useRef();
  const coolingFlowRef = useRef();

  // Master crank angle in radians
  const crankAngleRef = useRef(0);
  const [hoveredPartId, setHoveredPartId] = useState(null);

  // Mechanical dimensions
  // Mechanical dimensions
  const crankRadius = 0.26;
  const rodLength = 1.25;
  const explodeFactor = exploded ? 1.0 : 0.0;

  // Step button handler
  useEffect(() => {
    if (stepTrigger > 0) {
      crankAngleRef.current += Math.PI / 2; // Advance 90 deg
    }
  }, [stepTrigger]);

  // Main animation frame loop (Kinematic Synchronization)
  useFrame((state, delta) => {
    const rawRpm = telemetry?.rpm !== undefined ? Number(telemetry.rpm) : 2400;
    const activeRpm = Math.max(200, rawRpm);

    if (isPlaying) {
      const radSpeed = (activeRpm / 60) * Math.PI * 2 * playbackSpeed * delta;
      crankAngleRef.current += radSpeed;
    }

    const theta = crankAngleRef.current;
    // 720 degree cycle (4 strokes = 4 * PI radians)
    const cycleAngle = theta % (Math.PI * 4);
    const degCycle = ((cycleAngle / (Math.PI * 4)) * 720) % 720;

    if (onCycleUpdate) {
      onCycleUpdate(degCycle);
    }

    // 1. ROTATE PROPELLER & HUB
    if (propHubRef.current) {
      propHubRef.current.rotation.z = theta;
    }

    // 2. ROTATE CRANKSHAFT
    if (crankshaftRef.current) {
      crankshaftRef.current.rotation.z = theta;
    }

    // 3. EXACT KINEMATIC SLIDER-CRANK MECHANISM FOR 4 OPPOSED CYLINDERS
    // Crankpin World Coordinates
    // Front throw (z = 0.45): idx = 0, offset [0, crankRadius, 0] rotated around Z
    const xPin1 = -crankRadius * Math.sin(theta);
    const yPin1 = 0.05 + crankRadius * Math.cos(theta);

    // Rear throw (z = -0.45): idx = 1, offset [0, -crankRadius, 0] rotated around Z
    const xPin2 = crankRadius * Math.sin(theta);
    const yPin2 = 0.05 - crankRadius * Math.cos(theta);

    const h1 = yPin1 - 0.05;
    const h2 = yPin2 - 0.05;
    const dxRod1 = Math.sqrt(Math.max(0.001, rodLength * rodLength - h1 * h1));
    const dxRod2 = Math.sqrt(Math.max(0.001, rodLength * rodLength - h2 * h2));

    // Left Bank: Cyl 1 & 2 along -X axis
    const xPiston1 = xPin1 - dxRod1 - explodeFactor * 0.8;
    const xPiston2 = xPin2 - dxRod2 - explodeFactor * 0.8;

    // Right Bank: Cyl 3 & 4 along +X axis
    const xPiston3 = xPin1 + dxRod1 + explodeFactor * 0.8;
    const xPiston4 = xPin2 + dxRod2 + explodeFactor * 0.8;

    // Update Left Bank (Pistons 1 & 2, Rods 1 & 2)
    if (piston1Ref.current) piston1Ref.current.position.x = xPiston1;
    if (piston2Ref.current) piston2Ref.current.position.x = xPiston2;

    if (rod1Ref.current) {
      rod1Ref.current.position.set((xPin1 + xPiston1) / 2, (yPin1 + 0.05) / 2, 0.45);
      rod1Ref.current.rotation.z = Math.atan2(0.05 - yPin1, xPiston1 - xPin1);
    }
    if (rod2Ref.current) {
      rod2Ref.current.position.set((xPin2 + xPiston2) / 2, (yPin2 + 0.05) / 2, -0.45);
      rod2Ref.current.rotation.z = Math.atan2(0.05 - yPin2, xPiston2 - xPin2);
    }

    // Update Right Bank (Pistons 3 & 4, Rods 3 & 4)
    if (piston3Ref.current) piston3Ref.current.position.x = xPiston3;
    if (piston4Ref.current) piston4Ref.current.position.x = xPiston4;

    if (rod3Ref.current) {
      rod3Ref.current.position.set((xPin1 + xPiston3) / 2, (yPin1 + 0.05) / 2, 0.45);
      rod3Ref.current.rotation.z = Math.atan2(0.05 - yPin1, xPiston3 - xPin1);
    }
    if (rod4Ref.current) {
      rod4Ref.current.position.set((xPin2 + xPiston4) / 2, (yPin2 + 0.05) / 2, -0.45);
      rod4Ref.current.rotation.z = Math.atan2(0.05 - yPin2, xPiston4 - xPin2);
    }

    // 4. ROTATE TURBOCHARGER IMPELLER & TURBINE WHEEL according to RPM
    if (turboShaftRef.current) {
      turboShaftRef.current.rotation.x = theta * 3.5;
    }

    // 5. VALVE ACTUATION, ROCKER ARMS & SPARK IGNITION
    const updateCylinderValvesAndSpark = (degOffset, inRef, exRef, rockerRef, sparkRef, isLeft) => {
      const localDeg = (degCycle + degOffset) % 720;
      let inLift = 0;
      let exLift = 0;
      let sparkIntensity = 0;

      // STROKE 1: INTAKE (0° - 180°) -> Intake valve opens
      if (localDeg >= 10 && localDeg < 170) {
        inLift = Math.sin(((localDeg - 10) / 160) * Math.PI) * 0.12;
      }
      // STROKE 4: EXHAUST (540° - 720°) -> Exhaust valve opens
      if (localDeg >= 550 && localDeg < 710) {
        exLift = Math.sin(((localDeg - 550) / 160) * Math.PI) * 0.12;
      }
      // STROKE 3: POWER (360° - 540°) -> Spark plug fires at TDC
      if (localDeg >= 360 && localDeg < 410) {
        sparkIntensity = 1.0 - (localDeg - 360) / 50;
      }

      const sign = isLeft ? 1 : -1;
      if (inRef.current) inRef.current.position.x = sign * inLift;
      if (exRef.current) exRef.current.position.x = sign * exLift;

      // Rocker arm slight tilt
      if (rockerRef.current) {
        const totalTilt = (inLift - exLift) * 1.8;
        rockerRef.current.rotation.z = sign * totalTilt;
      }

      if (sparkRef.current) {
        sparkRef.current.visible = showIgnition && sparkIntensity > 0.05;
        if (sparkRef.current.material) {
          sparkRef.current.material.opacity = sparkIntensity;
        }
      }
    };

    updateCylinderValvesAndSpark(0, inValve1Ref, exValve1Ref, rocker1Ref, spark1Ref, true);
    updateCylinderValvesAndSpark(360, inValve2Ref, exValve2Ref, rocker2Ref, spark2Ref, true);
    updateCylinderValvesAndSpark(180, inValve3Ref, exValve3Ref, rocker3Ref, spark3Ref, false);
    updateCylinderValvesAndSpark(540, inValve4Ref, exValve4Ref, rocker4Ref, spark4Ref, false);

    // 5. ANIMATE FLOW BEADS
    const time = state.clock.getElapsedTime();
    if (airFuelFlowRef.current) {
      airFuelFlowRef.current.position.z = (time * 1.8) % 1.2;
    }
    if (exhaustFlowRef.current) {
      exhaustFlowRef.current.position.z = -((time * 2.4) % 1.6);
    }
    if (oilFlowRef.current) {
      oilFlowRef.current.position.y = -0.6 + Math.sin(time * 3) * 0.08;
    }
    if (coolingFlowRef.current) {
      coolingFlowRef.current.position.z = -((time * 3.0) % 2.0);
    }

    // 6. ANIMATE SUBTLE PULSE ON ACTIVE FAULT MATERIALS
    if (faultMaterialsRef.current.length > 0) {
      const pulseIntensity = 0.45 + Math.sin(time * 5.0) * 0.35;
      for (let i = 0; i < faultMaterialsRef.current.length; i++) {
        faultMaterialsRef.current[i].emissiveIntensity = pulseIntensity;
      }
    }
  });

  // Dynamic status and materials generator
  const getMaterial = (partId, defaultProps, options = {}) => {
    const isSelected = selectedPartId === partId;
    const isHovered = hoveredPartId === partId;
    const partDef = ENGINE_PARTS.find((p) => p.id === partId);
    const faultInfo = partDef
      ? getComponentFaultDetails(partDef, telemetry, digitalTwin, ai)
      : { status: 'NORMAL', isPulsing: false };

    let baseColor = defaultProps.color || '#475569';
    let emissiveColor = '#000000';
    let emissiveIntensity = 0;
    let transparent = false;
    let opacity = 1.0;

    // Thermal mode color overrides based on live CHT / EGT
    if (thermalMap && options.thermalResponsive) {
      if (partId === 'cylinder_head' || partId.startsWith('cylinder')) {
        const cht = telemetry.cht ? Number(telemetry.cht) : 110;
        if (cht > 140) {
          baseColor = '#ef4444';
          emissiveColor = '#b91c1c';
          emissiveIntensity = 0.5;
        } else if (cht > 125) {
          baseColor = '#f59e0b';
          emissiveColor = '#d97706';
          emissiveIntensity = 0.35;
        } else {
          baseColor = '#3b82f6';
        }
      } else if (partId === 'exhaust_manifold' || partId.startsWith('turbo')) {
        const egt = telemetry.egt ? Number(telemetry.egt) : 780;
        if (egt > 850) {
          baseColor = '#dc2626';
          emissiveColor = '#991b1b';
          emissiveIntensity = 0.7;
        } else if (egt > 800) {
          baseColor = '#ea580c';
          emissiveColor = '#c2410c';
          emissiveIntensity = 0.5;
        } else {
          baseColor = '#b45309';
          emissiveColor = '#78350f';
          emissiveIntensity = 0.2;
        }
      }
    }

    // Cutaway mode transparency for crankcase and cylinder barrels
    if (isCutaway && options.allowCutaway) {
      transparent = true;
      opacity = 0.28;
    }

    // Fault & Anomaly Highlights vs Normal vs Selection
    // NORMAL = normal individual baseColor, emissiveColor = '#000000', emissiveIntensity = 0
    // WARNING = yellow/orange glow only on affected part (keeps baseColor)
    // FAULT = red glow/pulse only on affected part (keeps baseColor)
    if (isSelected) {
      emissiveColor = '#38bdf8';
      emissiveIntensity = 0.6;
    } else if (isHovered) {
      emissiveColor = '#0284c7';
      emissiveIntensity = 0.35;
    } else if (faultInfo.status === 'FAULT') {
      // Red glow only on the affected component
      emissiveColor = '#ef4444';
      emissiveIntensity = 0.6;
    } else if (faultInfo.status === 'WARNING') {
      // Yellow/orange glow only on the affected component
      emissiveColor = '#f59e0b';
      emissiveIntensity = 0.55;
    }

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity,
      transparent,
      opacity,
      wireframe,
      roughness: defaultProps.roughness !== undefined ? defaultProps.roughness : 0.25,
      metalness: defaultProps.metalness !== undefined ? defaultProps.metalness : 0.85,
    });

    if (faultInfo.status === 'FAULT' && faultInfo.isPulsing && !isSelected && !isHovered) {
      faultMaterialsRef.current.push(material);
    }

    return material;
  };

  // Materials palette (Enhanced high-contrast aerospace finishes)
  const crankcaseMat = getMaterial('crankcase', { color: '#64748b', metalness: 0.8, roughness: 0.25 }, { allowCutaway: true });
  const cylinderMat = getMaterial('cylinder_1', { color: '#64748b', metalness: 0.82, roughness: 0.25 }, { allowCutaway: true });
  const headMat = getMaterial('cylinder_head', { color: '#cbd5e1', metalness: 0.9, roughness: 0.2 }, { thermalResponsive: true });
  const pistonMat = getMaterial('piston', { color: '#f8fafc', metalness: 0.95, roughness: 0.12 });
  const rodMat = getMaterial('connecting_rod', { color: '#cbd5e1', metalness: 0.92, roughness: 0.18 });
  const crankshaftMat = getMaterial('crankshaft', { color: '#ffffff', metalness: 0.96, roughness: 0.1 });
  const gearboxMat = getMaterial('reduction_gearbox', { color: '#475569', metalness: 0.88, roughness: 0.25 });
  const propHubMat = getMaterial('propeller_hub', { color: '#334155', metalness: 0.85, roughness: 0.3 });
  const propellerMat = getMaterial('propeller', { color: '#1e293b', metalness: 0.75, roughness: 0.3 });
  const finMat = getMaterial('cooling_fins', { color: '#cbd5e1', metalness: 0.9, roughness: 0.2 });
  const inValveMat = getMaterial('intake_valve', { color: '#38bdf8', metalness: 0.9, roughness: 0.2 });
  const exValveMat = getMaterial('exhaust_valve', { color: '#ea580c', metalness: 0.9, roughness: 0.2, emissive: '#9a3412', emissiveIntensity: 0.3 });
  const sparkMat = getMaterial('spark_plug', { color: '#f87171', metalness: 0.7, roughness: 0.3 });
  const rockerMat = getMaterial('rocker_arm', { color: '#94a3b8', metalness: 0.9, roughness: 0.25 });
  const pushrodMat = getMaterial('pushrod', { color: '#64748b', metalness: 0.85, roughness: 0.3 });
  const intakeMat = getMaterial('intake_manifold', { color: '#0284c7', metalness: 0.6, roughness: 0.35 });
  const injectorMat = getMaterial('fuel_injector', { color: '#ef4444', metalness: 0.7, roughness: 0.3 });
  const exhaustMat = getMaterial('exhaust_manifold', { color: '#b45309', metalness: 0.9, roughness: 0.35 }, { thermalResponsive: true });
  const turboMat = getMaterial('turbocharger', { color: '#78350f', metalness: 0.9, roughness: 0.3 }, { thermalResponsive: true });
  const turboInMat = getMaterial('turbo_intake', { color: '#38bdf8', metalness: 0.65, roughness: 0.35 });
  const turboExMat = getMaterial('turbo_exhaust', { color: '#9a3412', metalness: 0.88, roughness: 0.3 });
  const exhaustOutletMat = getMaterial('exhaust_outlet', { color: '#78350f', metalness: 0.88, roughness: 0.35 });
  const oilSumpMat = getMaterial('oil_sump', { color: '#334155', metalness: 0.8, roughness: 0.35 });
  const oilPumpMat = getMaterial('oil_pump', { color: '#ca8a04', metalness: 0.8, roughness: 0.3 });
  const oilFilterMat = getMaterial('oil_filter', { color: '#eab308', metalness: 0.65, roughness: 0.35 });

  const handlePointer = (e, partId) => {
    e.stopPropagation();
    onSelectPart(partId);
  };

  // Show ONLY the selected/affected component by default.
  // If SHOW NAMES is enabled, show all labels as small 10px badges.
  const visibleLabelParts = useMemo(() => {
    const list = showNames ? [...MAJOR_FIVE_LABELS] : [];

    // Always show the selected or affected component if one is active
    if (activePartId) {
      const alreadyIncluded = list.some((p) => p.id === activePartId);
      if (!alreadyIncluded) {
        const activeObj = ENGINE_PARTS.find((p) => p.id === activePartId);
        if (activeObj) {
          list.push(activeObj);
        }
      }
    }

    return list;
  }, [showNames, activePartId]);

  return (
    <group ref={groupRef} position={[0, 0, -0.05]} scale={[0.76, 0.76, 0.76]}>
      {/* ============================================================= */}
      {/* 1. CRANKCASE HOUSING (Split Aero Boxer Case) */}
      {/* ============================================================= */}
      <group position={[0, 0, 0]}>
        {/* Main Lower/Upper Crankcase Body */}
        <mesh
          material={crankcaseMat}
          position={[0, 0, 0]}
          castShadow
          receiveShadow
          onClick={(e) => handlePointer(e, 'crankcase')}
          onPointerOver={() => setHoveredPartId('crankcase')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <boxGeometry args={[1.34, 1.1, 2.1]} />
        </mesh>

        {/* Top Spine Deck & Camshaft Gallery */}
        <mesh material={crankcaseMat} position={[0, 0.62, 0]} onClick={(e) => handlePointer(e, 'crankcase')}>
          <boxGeometry args={[0.86, 0.16, 1.9]} />
        </mesh>

        {/* Crankcase Split Flange Line */}
        <mesh material={gearboxMat} position={[0, 0, 0]}>
          <boxGeometry args={[1.38, 0.04, 2.14]} />
        </mesh>

        {/* Side Engine Mount Lugs (4 Lugs) */}
        {[-0.68, 0.68].map((x, xi) =>
          [-0.6, 0.6].map((z, zi) => (
            <mesh key={`${xi}-${zi}`} material={gearboxMat} position={[x, -0.25, z]}>
              <boxGeometry args={[0.12, 0.18, 0.2]} />
            </mesh>
          ))
        )}
      </group>

      {/* ============================================================= */}
      {/* 2. ROTATING CRANKSHAFT & COUNTERWEIGHTS */}
      {/* ============================================================= */}
      <group ref={crankshaftRef} position={[0, 0.05, 0]}>
        {/* Center Main Journals */}
        <mesh
          material={crankshaftMat}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handlePointer(e, 'crankshaft')}
          onPointerOver={() => setHoveredPartId('crankshaft')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.16, 0.16, 2.3, 24]} />
        </mesh>

        {/* 4 Counterweights & Offset Crankpins */}
        {[-0.45, 0.45].map((zPos, idx) => (
          <group key={idx} position={[0, 0, zPos]}>
            {/* Counterweight Web */}
            <mesh material={crankshaftMat} position={[0, idx === 0 ? 0.22 : -0.22, 0]}>
              <boxGeometry args={[0.42, 0.28, 0.16]} />
            </mesh>
            {/* Crankpin Journal */}
            <mesh
              material={crankshaftMat}
              position={[0, idx === 0 ? crankRadius : -crankRadius, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.1, 0.1, 0.22, 16]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ============================================================= */}
      {/* 3. REDUCTION GEARBOX (PRGB) */}
      {/* ============================================================= */}
      <group position={[0, 0.1, 1.35 + explodeFactor * 0.7]}>
        {/* Gearbox Housing Casing */}
        <mesh
          material={gearboxMat}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handlePointer(e, 'reduction_gearbox')}
          onPointerOver={() => setHoveredPartId('reduction_gearbox')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.48, 0.62, 0.44, 24]} />
        </mesh>
        {/* Front Output Shaft Flange */}
        <mesh material={gearboxMat} position={[0, 0, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.08, 24]} />
        </mesh>
        {/* Inspection / Oil Plug */}
        <mesh material={gearboxMat} position={[0.26, 0.28, 0.05]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
        </mesh>
      </group>

      {/* ============================================================= */}
      {/* 4. PROPELLER & SPINNER HUB */}
      {/* ============================================================= */}
      <group position={[0, 0.1, 1.75 + explodeFactor * 1.2]}>
        {/* Rotating Hub Assembly */}
        <group ref={propHubRef} position={[0, 0, 0]}>
          {/* Central Hub Plate */}
          <mesh
            material={propHubMat}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => handlePointer(e, 'propeller_hub')}
            onPointerOver={() => setHoveredPartId('propeller_hub')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.36, 0.36, 0.18, 24]} />
          </mesh>

          {/* Aerodynamic Spinner Cone */}
          <mesh
            material={propHubMat}
            position={[0, 0, 0.18]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => handlePointer(e, 'propeller_hub')}
          >
            <coneGeometry args={[0.36, 0.38, 24]} />
          </mesh>

          {/* 3 Aerodynamic Scimitar Carbon Blades */}
          {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((ang, i) => (
            <group key={i} rotation={[0, 0, ang]}>
              <mesh
                material={propellerMat}
                position={[0, 1.25, 0]}
                rotation={[0, 0.16, 0]}
                onClick={(e) => handlePointer(e, 'propeller')}
                onPointerOver={() => setHoveredPartId('propeller')}
                onPointerOut={() => setHoveredPartId(null)}
              >
                <boxGeometry args={[0.16, 2.2, 0.035]} />
              </mesh>
              {/* High-visibility aviation safety tip stripe (Aviation Yellow) */}
              <mesh position={[0, 2.26, 0]}>
                <boxGeometry args={[0.165, 0.22, 0.038]} />
                <meshStandardMaterial color="#facc15" roughness={0.2} metalness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ============================================================= */}
      {/* 5. LEFT BANK: CYLINDERS 1 & 2 */}
      {/* ============================================================= */}
      <group position={[-explodeFactor * 1.0, 0, 0]}>
        {[0.45, -0.45].map((zPos, idx) => {
          const cylId = idx === 0 ? 'cylinder_1' : 'cylinder_2';
          const inRef = idx === 0 ? inValve1Ref : inValve2Ref;
          const exRef = idx === 0 ? exValve1Ref : exValve2Ref;
          const rockerRef = idx === 0 ? rocker1Ref : rocker2Ref;
          const sparkRef = idx === 0 ? spark1Ref : spark2Ref;

          return (
            <group key={idx} position={[-1.15, 0.05, zPos]}>
              {/* Cylinder Barrel */}
              <mesh
                material={cylinderMat}
                rotation={[0, 0, Math.PI / 2]}
                onClick={(e) => handlePointer(e, cylId)}
                onPointerOver={() => setHoveredPartId(cylId)}
                onPointerOut={() => setHoveredPartId(null)}
              >
                <cylinderGeometry args={[0.38, 0.4, 0.9, 20]} />
              </mesh>

              {/* Cooling Fins (6 Annular Rings) */}
              {[-0.32, -0.19, -0.06, 0.07, 0.2, 0.33].map((fPos, fIdx) => (
                <mesh
                  key={fIdx}
                  material={finMat}
                  position={[fPos, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  onClick={(e) => handlePointer(e, 'cooling_fins')}
                >
                  <cylinderGeometry args={[0.48, 0.48, 0.025, 20]} />
                </mesh>
              ))}

              {/* Cylinder Head & Valve Covers */}
              <mesh
                material={headMat}
                position={[-0.58 - explodeFactor * 0.4, 0, 0]}
                onClick={(e) => handlePointer(e, 'cylinder_head')}
                onPointerOver={() => setHoveredPartId('cylinder_head')}
                onPointerOut={() => setHoveredPartId(null)}
              >
                <boxGeometry args={[0.28, 0.72, 0.78]} />
              </mesh>

              {/* Spark Plug with Ceramic Insulator & Hex Body */}
              <group position={[-0.58 - explodeFactor * 0.4, 0.42, 0]}>
                <mesh material={sparkMat} onClick={(e) => handlePointer(e, 'spark_plug')}>
                  <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
                </mesh>
                <mesh material={crankshaftMat} position={[0, -0.07, 0]}>
                  <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
                </mesh>
              </group>

              {/* Rocker Arm Assembly */}
              <group ref={rockerRef} position={[-0.62 - explodeFactor * 0.4, 0.28, 0]}>
                <mesh material={rockerMat} onClick={(e) => handlePointer(e, 'rocker_arm')}>
                  <boxGeometry args={[0.18, 0.05, 0.32]} />
                </mesh>
              </group>

              {/* Pushrod Tubes (Twin Angled Tubes) */}
              <group position={[0.2, -0.32, 0]} rotation={[0, 0, 0.25]}>
                <mesh material={pushrodMat} position={[0, 0, 0.1]} onClick={(e) => handlePointer(e, 'pushrod')}>
                  <cylinderGeometry args={[0.025, 0.025, 0.65, 12]} />
                </mesh>
                <mesh material={pushrodMat} position={[0, 0, -0.1]} onClick={(e) => handlePointer(e, 'pushrod')}>
                  <cylinderGeometry args={[0.025, 0.025, 0.65, 12]} />
                </mesh>
              </group>

              {/* Intake Valve */}
              <group ref={inRef} position={[-0.55, 0.22, 0.15]}>
                <mesh material={inValveMat} rotation={[0, 0, Math.PI / 2]} onClick={(e) => handlePointer(e, 'intake_valve')}>
                  <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
                </mesh>
                <mesh material={inValveMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
                </mesh>
              </group>

              {/* Exhaust Valve */}
              <group ref={exRef} position={[-0.55, -0.22, -0.15]}>
                <mesh material={exValveMat} rotation={[0, 0, Math.PI / 2]} onClick={(e) => handlePointer(e, 'exhaust_valve')}>
                  <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
                </mesh>
                <mesh material={exValveMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
                </mesh>
              </group>

              {/* Spark Ignition / Combustion Flash Light */}
              <pointLight ref={sparkRef} color="#fbbf24" intensity={3.0} distance={1.8} position={[-0.5, 0, 0]} />
            </group>
          );
        })}

        {/* Piston 1 & Connecting Rod 1 */}
        <group ref={piston1Ref} position={[-1.0, 0.05, 0.45]}>
          <mesh
            material={pistonMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'piston')}
            onPointerOver={() => setHoveredPartId('piston')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
          </mesh>
          {/* Piston Compression Rings */}
          {[-0.08, 0.0, 0.08].map((rX, rI) => (
            <mesh key={rI} material={crankshaftMat} position={[rX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.344, 0.344, 0.015, 20]} />
            </mesh>
          ))}
        </group>

        <group ref={rod1Ref} position={[-0.6, 0.05, 0.45]}>
          <mesh
            material={rodMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'connecting_rod')}
            onPointerOver={() => setHoveredPartId('connecting_rod')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.05, 0.05, rodLength, 12]} />
          </mesh>
          {/* Big-end crankpin eye */}
          <mesh material={rodMat} position={[-rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.12, 16]} />
          </mesh>
          {/* Small-end wristpin eye */}
          <mesh material={rodMat} position={[rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          </mesh>
        </group>

        {/* Piston 2 & Connecting Rod 2 */}
        <group ref={piston2Ref} position={[-1.0, 0.05, -0.45]}>
          <mesh
            material={pistonMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'piston')}
            onPointerOver={() => setHoveredPartId('piston')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
          </mesh>
          {/* Piston Compression Rings */}
          {[-0.08, 0.0, 0.08].map((rX, rI) => (
            <mesh key={rI} material={crankshaftMat} position={[rX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.344, 0.344, 0.015, 20]} />
            </mesh>
          ))}
        </group>

        <group ref={rod2Ref} position={[-0.6, 0.05, -0.45]}>
          <mesh
            material={rodMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'connecting_rod')}
            onPointerOver={() => setHoveredPartId('connecting_rod')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.05, 0.05, rodLength, 12]} />
          </mesh>
          {/* Big-end crankpin eye */}
          <mesh material={rodMat} position={[-rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.12, 16]} />
          </mesh>
          {/* Small-end wristpin eye */}
          <mesh material={rodMat} position={[rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          </mesh>
        </group>
      </group>

      {/* ============================================================= */}
      {/* 6. RIGHT BANK: CYLINDERS 3 & 4 */}
      {/* ============================================================= */}
      <group position={[explodeFactor * 1.0, 0, 0]}>
        {[0.45, -0.45].map((zPos, idx) => {
          const cylId = idx === 0 ? 'cylinder_3' : 'cylinder_4';
          const inRef = idx === 0 ? inValve3Ref : inValve4Ref;
          const exRef = idx === 0 ? exValve3Ref : exValve4Ref;
          const rockerRef = idx === 0 ? rocker3Ref : rocker4Ref;
          const sparkRef = idx === 0 ? spark3Ref : spark4Ref;

          return (
            <group key={idx} position={[1.15, 0.05, zPos]}>
              {/* Cylinder Barrel */}
              <mesh
                material={cylinderMat}
                rotation={[0, 0, -Math.PI / 2]}
                onClick={(e) => handlePointer(e, cylId)}
                onPointerOver={() => setHoveredPartId(cylId)}
                onPointerOut={() => setHoveredPartId(null)}
              >
                <cylinderGeometry args={[0.38, 0.4, 0.9, 20]} />
              </mesh>

              {/* Cooling Fins (6 Annular Rings) */}
              {[-0.32, -0.19, -0.06, 0.07, 0.2, 0.33].map((fPos, fIdx) => (
                <mesh
                  key={fIdx}
                  material={finMat}
                  position={[-fPos, 0, 0]}
                  rotation={[0, 0, -Math.PI / 2]}
                  onClick={(e) => handlePointer(e, 'cooling_fins')}
                >
                  <cylinderGeometry args={[0.48, 0.48, 0.025, 20]} />
                </mesh>
              ))}

              {/* Cylinder Head & Valve Covers */}
              <mesh
                material={headMat}
                position={[0.58 + explodeFactor * 0.4, 0, 0]}
                onClick={(e) => handlePointer(e, 'cylinder_head')}
                onPointerOver={() => setHoveredPartId('cylinder_head')}
                onPointerOut={() => setHoveredPartId(null)}
              >
                <boxGeometry args={[0.28, 0.72, 0.78]} />
              </mesh>

              {/* Spark Plug with Ceramic Insulator & Hex Body */}
              <group position={[0.58 + explodeFactor * 0.4, 0.42, 0]}>
                <mesh material={sparkMat} onClick={(e) => handlePointer(e, 'spark_plug')}>
                  <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
                </mesh>
                <mesh material={crankshaftMat} position={[0, -0.07, 0]}>
                  <cylinderGeometry args={[0.055, 0.055, 0.04, 6]} />
                </mesh>
              </group>

              {/* Rocker Arm Assembly */}
              <group ref={rockerRef} position={[0.62 + explodeFactor * 0.4, 0.28, 0]}>
                <mesh material={rockerMat} onClick={(e) => handlePointer(e, 'rocker_arm')}>
                  <boxGeometry args={[0.18, 0.05, 0.32]} />
                </mesh>
              </group>

              {/* Pushrod Tubes (Twin Angled Tubes) */}
              <group position={[-0.2, -0.32, 0]} rotation={[0, 0, -0.25]}>
                <mesh material={pushrodMat} position={[0, 0, 0.1]} onClick={(e) => handlePointer(e, 'pushrod')}>
                  <cylinderGeometry args={[0.025, 0.025, 0.65, 12]} />
                </mesh>
                <mesh material={pushrodMat} position={[0, 0, -0.1]} onClick={(e) => handlePointer(e, 'pushrod')}>
                  <cylinderGeometry args={[0.025, 0.025, 0.65, 12]} />
                </mesh>
              </group>

              {/* Intake Valve */}
              <group ref={inRef} position={[0.55, 0.22, 0.15]}>
                <mesh material={inValveMat} rotation={[0, 0, -Math.PI / 2]} onClick={(e) => handlePointer(e, 'intake_valve')}>
                  <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
                </mesh>
                <mesh material={inValveMat} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
                </mesh>
              </group>

              {/* Exhaust Valve */}
              <group ref={exRef} position={[0.55, -0.22, -0.15]}>
                <mesh material={exValveMat} rotation={[0, 0, -Math.PI / 2]} onClick={(e) => handlePointer(e, 'exhaust_valve')}>
                  <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
                </mesh>
                <mesh material={exValveMat} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
                </mesh>
              </group>

              {/* Spark Ignition / Combustion Flash Light */}
              <pointLight ref={sparkRef} color="#fbbf24" intensity={3.0} distance={1.8} position={[0.5, 0, 0]} />
            </group>
          );
        })}

        {/* Piston 3 & Connecting Rod 3 */}
        <group ref={piston3Ref} position={[1.0, 0.05, 0.45]}>
          <mesh
            material={pistonMat}
            rotation={[0, 0, -Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'piston')}
            onPointerOver={() => setHoveredPartId('piston')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
          </mesh>
          {/* Piston Compression Rings */}
          {[-0.08, 0.0, 0.08].map((rX, rI) => (
            <mesh key={rI} material={crankshaftMat} position={[-rX, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.344, 0.344, 0.015, 20]} />
            </mesh>
          ))}
        </group>

        <group ref={rod3Ref} position={[0.6, 0.05, 0.45]}>
          <mesh
            material={rodMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'connecting_rod')}
            onPointerOver={() => setHoveredPartId('connecting_rod')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.05, 0.05, rodLength, 12]} />
          </mesh>
          {/* Big-end crankpin eye */}
          <mesh material={rodMat} position={[-rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.12, 16]} />
          </mesh>
          {/* Small-end wristpin eye */}
          <mesh material={rodMat} position={[rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          </mesh>
        </group>

        {/* Piston 4 & Connecting Rod 4 */}
        <group ref={piston4Ref} position={[1.0, 0.05, -0.45]}>
          <mesh
            material={pistonMat}
            rotation={[0, 0, -Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'piston')}
            onPointerOver={() => setHoveredPartId('piston')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
          </mesh>
          {/* Piston Compression Rings */}
          {[-0.08, 0.0, 0.08].map((rX, rI) => (
            <mesh key={rI} material={crankshaftMat} position={[-rX, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <cylinderGeometry args={[0.344, 0.344, 0.015, 20]} />
            </mesh>
          ))}
        </group>

        <group ref={rod4Ref} position={[0.6, 0.05, -0.45]}>
          <mesh
            material={rodMat}
            rotation={[0, 0, Math.PI / 2]}
            onClick={(e) => handlePointer(e, 'connecting_rod')}
            onPointerOver={() => setHoveredPartId('connecting_rod')}
            onPointerOut={() => setHoveredPartId(null)}
          >
            <cylinderGeometry args={[0.05, 0.05, rodLength, 12]} />
          </mesh>
          {/* Big-end crankpin eye */}
          <mesh material={rodMat} position={[-rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.12, 16]} />
          </mesh>
          {/* Small-end wristpin eye */}
          <mesh material={rodMat} position={[rodLength / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.1, 16]} />
          </mesh>
        </group>
      </group>

      {/* ============================================================= */}
      {/* 7. INTAKE MANIFOLD & FUEL INJECTORS */}
      {/* ============================================================= */}
      <group position={[0, 0.82 + explodeFactor * 0.6, 0]}>
        {/* Central Intake Plenum Box */}
        <mesh
          material={intakeMat}
          position={[0, 0, 0]}
          onClick={(e) => handlePointer(e, 'intake_manifold')}
          onPointerOver={() => setHoveredPartId('intake_manifold')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <boxGeometry args={[0.72, 0.28, 1.4]} />
        </mesh>

        {/* 4 Intake Runner Tubes connecting Plenum to Cylinders */}
        {[-0.45, 0.45].map((z, zi) => (
          <group key={zi} position={[0, 0, z]}>
            {/* Left Runner */}
            <mesh
              material={intakeMat}
              position={[-0.62, -0.22, 0]}
              rotation={[0, 0, 0.42]}
              onClick={(e) => handlePointer(e, 'intake_manifold')}
            >
              <cylinderGeometry args={[0.06, 0.06, 0.72, 16]} />
            </mesh>
            {/* Left Fuel Injector */}
            <mesh
              material={injectorMat}
              position={[-0.82, -0.16, 0]}
              rotation={[0, 0, 0.7]}
              onClick={(e) => handlePointer(e, 'fuel_injector')}
              onPointerOver={() => setHoveredPartId('fuel_injector')}
              onPointerOut={() => setHoveredPartId(null)}
            >
              <cylinderGeometry args={[0.035, 0.035, 0.16, 12]} />
            </mesh>

            {/* Right Runner */}
            <mesh
              material={intakeMat}
              position={[0.62, -0.22, 0]}
              rotation={[0, 0, -0.42]}
              onClick={(e) => handlePointer(e, 'intake_manifold')}
            >
              <cylinderGeometry args={[0.06, 0.06, 0.72, 16]} />
            </mesh>
            {/* Right Fuel Injector */}
            <mesh
              material={injectorMat}
              position={[0.82, -0.16, 0]}
              rotation={[0, 0, -0.7]}
              onClick={(e) => handlePointer(e, 'fuel_injector')}
              onPointerOver={() => setHoveredPartId('fuel_injector')}
              onPointerOut={() => setHoveredPartId(null)}
            >
              <cylinderGeometry args={[0.035, 0.035, 0.16, 12]} />
            </mesh>
          </group>
        ))}

        {/* Fuel Rail Feed Conduits */}
        <mesh material={crankshaftMat} position={[-0.84, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.3, 12]} />
        </mesh>
        <mesh material={crankshaftMat} position={[0.84, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.3, 12]} />
        </mesh>
      </group>

      {/* ============================================================= */}
      {/* 8. EXHAUST MANIFOLD & 4-INTO-1 COLLECTOR */}
      {/* ============================================================= */}
      <group position={[0, -0.58 - explodeFactor * 0.6, 0]}>
        {/* Left Exhaust Header Pipes */}
        <mesh material={exhaustMat} position={[-0.75, -0.12, 0]} rotation={[0, 0, -0.35]} onClick={(e) => handlePointer(e, 'exhaust_manifold')}>
          <cylinderGeometry args={[0.065, 0.065, 1.4, 16]} />
        </mesh>
        {/* Right Exhaust Header Pipes */}
        <mesh material={exhaustMat} position={[0.75, -0.12, 0]} rotation={[0, 0, 0.35]} onClick={(e) => handlePointer(e, 'exhaust_manifold')}>
          <cylinderGeometry args={[0.065, 0.065, 1.4, 16]} />
        </mesh>
        {/* 4-into-1 Merge Collector Pipe */}
        <mesh
          material={exhaustMat}
          position={[0, -0.22, -0.75]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handlePointer(e, 'exhaust_manifold')}
          onPointerOver={() => setHoveredPartId('exhaust_manifold')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.11, 0.14, 0.8, 16]} />
        </mesh>
      </group>

      {/* ============================================================= */}
      {/* 9. TURBOCHARGER, TURBO INTAKE, TURBO EXHAUST, & OUTLET */}
      {/* ============================================================= */}
      <group position={[0, -0.55 - explodeFactor * 0.7, -1.65 - explodeFactor * 0.6]}>
        {/* Turbine Scroll Housing (Heat Bronze) */}
        <mesh
          material={turboMat}
          position={[-0.24, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          onClick={(e) => handlePointer(e, 'turbocharger')}
          onPointerOver={() => setHoveredPartId('turbocharger')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <torusGeometry args={[0.26, 0.12, 16, 24]} />
        </mesh>

        {/* Compressor Scroll Housing (Machined Silver) */}
        <mesh
          material={crankshaftMat}
          position={[0.24, 0, 0]}
          rotation={[0, Math.PI / 2, 0]}
          onClick={(e) => handlePointer(e, 'turbocharger')}
          onPointerOver={() => setHoveredPartId('turbocharger')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <torusGeometry args={[0.26, 0.12, 16, 24]} />
        </mesh>

        {/* Center Bearing Cartridge (CHRA) */}
        <mesh material={crankcaseMat} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.36, 16]} />
        </mesh>

        {/* Rapidly Spinning Turbo Impeller & Turbine Assembly */}
        <group ref={turboShaftRef} position={[0, 0, 0]}>
          {/* Central High-Speed Turbine Shaft */}
          <mesh material={crankshaftMat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.54, 16]} />
          </mesh>
          {/* Compressor Impeller Wheel (Machined Aluminum, curved radial blades) */}
          <group position={[0.24, 0, 0]}>
            <mesh material={crankshaftMat} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.18, 0.05, 0.08, 16]} />
            </mesh>
            {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((bAng, bIdx) => (
              <mesh key={bIdx} material={crankshaftMat} rotation={[bAng, 0, 0]} position={[0, 0.09, 0]}>
                <boxGeometry args={[0.06, 0.16, 0.015]} />
              </mesh>
            ))}
          </group>
          {/* Inconel Exhaust Turbine Wheel (Bronze, curved blades) */}
          <group position={[-0.24, 0, 0]}>
            <mesh material={turboMat} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.18, 0.05, 0.08, 16]} />
            </mesh>
            {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((bAng, bIdx) => (
              <mesh key={bIdx} material={turboExMat} rotation={[bAng, 0, 0]} position={[0, 0.09, 0]}>
                <boxGeometry args={[0.06, 0.16, 0.015]} />
              </mesh>
            ))}
          </group>
        </group>

        {/* Wastegate Actuator Canister */}
        <mesh material={gearboxMat} position={[0.28, 0.32, -0.05]} rotation={[0, 0, 0.4]}>
          <cylinderGeometry args={[0.07, 0.07, 0.18, 16]} />
        </mesh>

        {/* Turbo Intake Air Duct & High-Flow Conical Filter */}
        <group position={[0.45, 0.12, 0]}>
          <mesh material={turboInMat} rotation={[0, 0, Math.PI / 2]} onClick={(e) => handlePointer(e, 'turbo_intake')}>
            <cylinderGeometry args={[0.09, 0.09, 0.28, 16]} />
          </mesh>
          <mesh material={turboInMat} position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]} onClick={(e) => handlePointer(e, 'turbo_intake')}>
            <coneGeometry args={[0.16, 0.26, 16]} />
          </mesh>
        </group>

        {/* Turbo Exhaust Inlet Flange from Collector */}
        <mesh
          material={turboExMat}
          position={[-0.32, -0.15, 0.28]}
          rotation={[Math.PI / 4, 0, 0]}
          onClick={(e) => handlePointer(e, 'turbo_exhaust')}
          onPointerOver={() => setHoveredPartId('turbo_exhaust')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.09, 0.09, 0.35, 16]} />
        </mesh>

        {/* Exhaust Tailpipe Outlet */}
        <mesh
          material={exhaustOutletMat}
          position={[-0.24, -0.15, -0.45]}
          rotation={[Math.PI / 3, 0, 0]}
          onClick={(e) => handlePointer(e, 'exhaust_outlet')}
          onPointerOver={() => setHoveredPartId('exhaust_outlet')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.09, 0.09, 0.45, 16]} />
        </mesh>
      </group>

      {/* ============================================================= */}
      {/* 10. LUBRICATION SYSTEM: OIL SUMP, OIL PUMP, & OIL FILTER */}
      {/* ============================================================= */}
      <group position={[0, -0.68 - explodeFactor * 0.5, 0]}>
        {/* Cast Oil Sump Pan */}
        <mesh
          material={oilSumpMat}
          position={[0, -0.18, 0.1]}
          onClick={(e) => handlePointer(e, 'oil_sump')}
          onPointerOver={() => setHoveredPartId('oil_sump')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <boxGeometry args={[0.92, 0.28, 1.45]} />
        </mesh>

        {/* Oil Sump Cooling Ribs */}
        {[-0.3, 0, 0.3].map((z, zi) => (
          <mesh key={zi} material={gearboxMat} position={[0, -0.34, z + 0.1]}>
            <boxGeometry args={[0.88, 0.04, 0.08]} />
          </mesh>
        ))}

        {/* Oil Drain Plug */}
        <mesh material={crankshaftMat} position={[0, -0.34, -0.45]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 6]} />
        </mesh>

        {/* Mechanical Oil Pump Housing (Front Gearcase) */}
        <mesh
          material={oilPumpMat}
          position={[0.35, 0.15, 0.95]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handlePointer(e, 'oil_pump')}
          onPointerOver={() => setHoveredPartId('oil_pump')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>

        {/* Spin-On Aviation Oil Filter (Aviation Yellow Canister) */}
        <mesh
          material={oilFilterMat}
          position={[0.65, 0.18, 0.65]}
          rotation={[0, 0, -Math.PI / 4]}
          onClick={(e) => handlePointer(e, 'oil_filter')}
          onPointerOver={() => setHoveredPartId('oil_filter')}
          onPointerOut={() => setHoveredPartId(null)}
        >
          <cylinderGeometry args={[0.12, 0.12, 0.32, 20]} />
        </mesh>
      </group>

      {/* ============================================================= */}
      {/* 11. ANIMATED FLOW STREAMS (Cyan, Orange, Gold, Light Cyan) */}
      {/* ============================================================= */}
      {showAirFuel && (
        <group ref={airFuelFlowRef} position={[0, 0.85, 0]}>
          {[-0.45, 0.45].map((z, zi) => (
            <group key={zi} position={[0, 0, z]}>
              <mesh position={[-0.45, -0.15, 0]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
              <mesh position={[0.45, -0.15, 0]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#38bdf8" />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {showExhaust && (
        <group ref={exhaustFlowRef} position={[0, -0.65, -0.8]}>
          <mesh position={[-0.4, 0, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
          <mesh position={[0.4, 0, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
          <mesh position={[0, 0, -0.5]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ea580c" />
          </mesh>
        </group>
      )}

      {showOil && (
        <group ref={oilFlowRef} position={[0.2, -0.55, 0.3]}>
          <mesh position={[0.15, 0, 0.3]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#eab308" />
          </mesh>
          <mesh position={[-0.2, 0.2, -0.1]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color="#eab308" />
          </mesh>
        </group>
      )}

      {showCooling && (
        <group ref={coolingFlowRef} position={[0, 0.2, 0.6]}>
          <mesh position={[-1.2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.65} />
          </mesh>
          <mesh position={[1.2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.65} />
          </mesh>
        </group>
      )}

      {/* ============================================================= */}
      {/* 12. 3D LEADER LINES & NON-OVERLAPPING PART LABELS */}
      {/* ============================================================= */}
      {visibleLabelParts.length > 0 && (
        <group>
          {visibleLabelParts.map((part) => {
            const faultInfo = getComponentFaultDetails(part, telemetry, digitalTwin, ai);
            return (
              <ComponentLeaderLabel
                key={part.id}
                part={part}
                onSelect={onSelectPart}
                isSelected={selectedPartId === part.id}
                isFault={faultInfo.status === 'FAULT'}
                isWarning={faultInfo.status === 'WARNING'}
              />
            );
          })}
        </group>
      )}

      {/* ============================================================= */}
      {/* 13. ACTIVE COMPONENT 3D ANCHOR & HIGHLIGHT RING */}
      {/* ============================================================= */}
      {activePartAnchor && (
        <group position={activePartAnchor}>
          <mesh>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshBasicMaterial color={activeAnchorColor} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.055, 0.075, 24]} />
            <meshBasicMaterial color={activeAnchorColor} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Ground Reference Grid */}
      <gridHelper args={[6, 12, '#0284c7', '#1e293b']} position={[0, -0.75, 0]} />
    </group>
  );
}

/**
 * Responsive Viewport & Camera Aspect Ratio Manager
 * Ensures Three.js WebGL canvas width and height exactly match the viewport container
 * and recalculates camera aspect ratio and projection matrix immediately on resize.
 */
function ResponsiveViewportManager({ controlsRef, containerRef }) {
  const { camera, size, gl } = useThree();

  useEffect(() => {
    if (!camera || !gl) return;
    if (size.width > 0 && size.height > 0) {
      gl.setSize(size.width, size.height, false);
      if (camera.isPerspectiveCamera) {
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      }
      if (controlsRef?.current) {
        controlsRef.current.update();
      }
    }
  }, [camera, size.width, size.height, gl, controlsRef]);

  useEffect(() => {
    const handleResize = () => {
      if (!camera || !gl) return;
      const targetEl = containerRef?.current || gl.domElement?.parentElement;
      const width = targetEl?.clientWidth || window.innerWidth;
      const height = targetEl?.clientHeight || window.innerHeight;
      if (width > 0 && height > 0) {
        gl.setSize(width, height, false);
        if (camera.isPerspectiveCamera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
        if (controlsRef?.current) {
          controlsRef.current.update();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const ro = typeof ResizeObserver !== 'undefined' && containerRef?.current
      ? new ResizeObserver(handleResize)
      : null;
    if (ro && containerRef?.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
    };
  }, [camera, gl, controlsRef, containerRef]);

  return null;
}

/**
 * Camera Viewport Manager
 */
function CameraPresetHandler({ controlsRef, cameraTarget, onPresetDone }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraTarget || !controlsRef.current) return;
    const controls = controlsRef.current;

    const [px, py, pz] = cameraTarget.pos;
    const [tx, ty, tz] = cameraTarget.target;

    camera.position.set(px, py, pz);
    controls.target.set(tx, ty, tz);
    controls.update();

    if (onPresetDone) {
      onPresetDone();
    }
  }, [cameraTarget, camera, controlsRef, onPresetDone]);

  return null;
}

/**
 * AeroPistonEngine3D Component
 * Interactive working aero piston engine with clean controls, non-overlapping labels,
 * camera presets, cutaway mode, flow toggles, and live telemetry bindings.
 */
export default function AeroPistonEngine3D({
  selectedPartId = null,
  onSelectPart = () => {},
  selectedCylinder = 'CYLINDER 1',
  onSelectCylinder = () => {},
  onSwitchMode = () => {},
  telemetry = {},
  digitalTwin = {},
  ai = {},
  isConnected = false,
  height = 560,
}) {
  const [wireframe, setWireframe] = useState(false);
  const [isCutaway, setIsCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [thermalMap, setThermalMap] = useState(false);
  const [showNames, setShowNames] = useState(false); // Show ONLY selected/affected component by default

  // Flow toggles
  const [showAirFuel, setShowAirFuel] = useState(true);
  const [showExhaust, setShowExhaust] = useState(true);
  const [showIgnition, setShowIgnition] = useState(true);
  const [showOil, setShowOil] = useState(true);
  const [showCooling, setShowCooling] = useState(true);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [stepTrigger, setStepTrigger] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.6);
  const [currentDeg, setCurrentDeg] = useState(0);

  // Camera preset state
  const [cameraTarget, setCameraTarget] = useState(null);
  const [activePreset, setActivePreset] = useState('ISOMETRIC');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute overall AI / Digital Twin 3D engine status (NORMAL / WARNING / FAULT)
  const overallStatus = useMemo(() => {
    if (ai?.predicted_fault && ai.predicted_fault !== 'NORMAL') return 'FAULT';
    if (digitalTwin?.overall_status === 'CRITICAL') return 'FAULT';
    if (ai?.anomaly_status === 'ANOMALOUS') return 'WARNING';
    if (digitalTwin?.overall_status === 'WARNING') return 'WARNING';
    const deviations = digitalTwin?.deviations || {};
    if (Object.values(deviations).some((d) => d?.status === 'CRITICAL')) return 'FAULT';
    if (Object.values(deviations).some((d) => d?.status === 'WARNING')) return 'WARNING';
    return 'NORMAL';
  }, [ai, digitalTwin]);

  const affectedPartId = useMemo(() => {
    return getActiveFaultedPartId(ai, digitalTwin);
  }, [ai, digitalTwin]);

  const [dismissedPartId, setDismissedPartId] = useState(null);

  // If a new AI fault occurs, reset dismissed state so the operator sees the fault
  const prevAffectedRef = useRef(affectedPartId);
  useEffect(() => {
    if (affectedPartId && affectedPartId !== prevAffectedRef.current) {
      setDismissedPartId(null);
      prevAffectedRef.current = affectedPartId;
    }
  }, [affectedPartId]);

  // Which part is currently active?
  // 1. User clicked part takes highest priority.
  // 2. If no part clicked, but an AI fault is active (and not dismissed), show the affected part.
  const activePartId = selectedPartId || (dismissedPartId === affectedPartId ? null : affectedPartId);

  const activeCardPart = useMemo(() => {
    return activePartId ? ENGINE_PARTS.find((p) => p.id === activePartId) || null : null;
  }, [activePartId]);

  const activeCardFaultDetails = useMemo(() => {
    return activeCardPart
      ? getComponentFaultDetails(activeCardPart, telemetry, digitalTwin, ai)
      : null;
  }, [activeCardPart, telemetry, digitalTwin, ai]);

  const containerRef = useRef();
  const canvasContainerRef = useRef();
  const controlsRef = useRef();

  // Preset definitions with balanced framing (~50-60% viewport fill, perfectly centered)
  const applyPreset = useCallback((presetName) => {
    setActivePreset(presetName);
    if (presetName === 'ISOMETRIC') {
      setCameraTarget({ pos: [3.1, 1.7, 3.1], target: [0, 0, 0] });
    } else if (presetName === 'FRONT') {
      setCameraTarget({ pos: [0, 0.05, 4.4], target: [0, 0, 0] });
    } else if (presetName === 'SIDE') {
      setCameraTarget({ pos: [4.4, 0.1, 0], target: [0, 0, 0] });
    } else if (presetName === 'TOP') {
      setCameraTarget({ pos: [0, 4.8, 0.01], target: [0, 0, 0] });
    } else if (presetName === 'RESET') {
      setCameraTarget({ pos: [3.1, 1.7, 3.1], target: [0, 0, 0] });
      setActivePreset('ISOMETRIC');
    }
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Determine stroke phase for active cylinder
  const getCylinderStroke = (cylName, deg) => {
    let offset = 0;
    if (cylName === 'CYLINDER 2') offset = 360;
    if (cylName === 'CYLINDER 3') offset = 180;
    if (cylName === 'CYLINDER 4') offset = 540;

    const localDeg = (deg + offset) % 720;
    if (localDeg < 180) return { name: 'INTAKE', color: 'text-sky-400', bg: 'bg-sky-950/80 border-sky-600' };
    if (localDeg < 360) return { name: 'COMPRESSION', color: 'text-indigo-400', bg: 'bg-indigo-950/80 border-indigo-600' };
    if (localDeg < 540) return { name: 'POWER', color: 'text-amber-400', bg: 'bg-amber-950/80 border-amber-600 animate-pulse' };
    return { name: 'EXHAUST', color: 'text-orange-400', bg: 'bg-orange-950/80 border-orange-600' };
  };

  const activeStroke = getCylinderStroke(selectedCylinder, currentDeg);
  const selectedPart = ENGINE_PARTS.find((p) => p.id === selectedPartId) || ENGINE_PARTS[0];
  const partStatus = selectedPart ? getComponentStatus(selectedPart, telemetry, digitalTwin) : 'HEALTHY';

  return (
    <WebGLErrorBoundary height={height}>
      <div
        ref={containerRef}
        className="relative w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col select-none font-mono"
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : (typeof height === 'number' ? `${height}px` : height || '560px'),
          minHeight: isFullscreen ? '100vh' : '520px',
        }}
      >
        {/* Tech Grid */}
        <div className="absolute inset-0 tech-grid opacity-15 pointer-events-none" />

        {/* ------------------------------------------------------------- */}
        {/* TOP BAR: ENGINE INFO & MODE SWITCHERS */}
        {/* ------------------------------------------------------------- */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 bg-slate-950 border-b border-slate-800 z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>3D DIGITAL TWIN</span>
            </div>
            <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              Rotax 914 / 915 iS Turbocharged Boxer-4
            </span>

            {/* Small Status Indicator: NORMAL / WARNING / FAULT */}
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 transition-all shadow ${
                overallStatus === 'FAULT'
                  ? 'bg-rose-950/90 border-rose-600 text-rose-300'
                  : overallStatus === 'WARNING'
                  ? 'bg-amber-950/90 border-amber-600 text-amber-300'
                  : 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
              }`}
              title={
                overallStatus === 'FAULT'
                  ? `Fault State: ${ai?.predicted_fault || 'Critical'}`
                  : overallStatus === 'WARNING'
                  ? 'Warning / Anomaly Detected'
                  : 'Nominal Engine Operation'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  overallStatus === 'FAULT'
                    ? 'bg-rose-400 animate-ping'
                    : overallStatus === 'WARNING'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span>STATUS: {overallStatus}</span>
              {overallStatus === 'FAULT' && ai?.predicted_fault && ai.predicted_fault !== 'NORMAL' && (
                <span className="hidden xl:inline text-[9px] text-rose-300/90 font-normal">
                  [{ai.predicted_fault.replace(/_/g, ' ')}]
                </span>
              )}
            </div>
          </div>

          {/* Right Top Controls: 3D/2D Toggle, Show Names Toggle, Cutaway, Thermal, Presets */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Clear 3D / 2D Toggle */}
            <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700">
              <button
                type="button"
                className="px-2.5 py-1 rounded bg-sky-950 border border-sky-500 text-sky-200 font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>3D VIEW</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode && onSwitchMode('2D SCHEMATIC')}
                className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 text-xs transition-all flex items-center gap-1.5"
                title="Switch to 2D Technical Schematic Diagram"
              >
                <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                <span>2D SCHEMATIC</span>
              </button>
            </div>

            {/* Names Toggle: [SHOW NAMES] [HIDE NAMES] */}
            <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700">
              <button
                type="button"
                onClick={() => setShowNames(true)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  showNames
                    ? 'bg-sky-950 border border-sky-500 text-sky-200 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display clean labels near parts"
              >
                <Tag className={`w-3.5 h-3.5 ${showNames ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>SHOW NAMES</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNames(false)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !showNames
                    ? 'bg-slate-800 border border-slate-600 text-slate-200 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Hide all part labels for a clean 3D view"
              >
                <span>HIDE NAMES</span>
              </button>
            </div>

            {/* Cutaway Toggle */}
            <button
              type="button"
              onClick={() => setIsCutaway((v) => !v)}
              className={`px-2 py-1 rounded text-xs border flex items-center gap-1 transition-all ${
                isCutaway ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold shadow' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle cutaway mode to reveal pistons, rods, and crankshaft"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>CUTAWAY</span>
            </button>

            {/* Thermal Mode */}
            <button
              type="button"
              onClick={() => setThermalMap((v) => !v)}
              className={`px-2 py-1 rounded text-xs border flex items-center gap-1 transition-all ${
                thermalMap ? 'bg-rose-950 border-rose-500 text-rose-200 font-bold shadow' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle live thermal visualization based on CHT / EGT"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">THERMAL</span>
            </button>

            {/* Exploded View */}
            <button
              type="button"
              onClick={() => setExploded((v) => !v)}
              className={`px-2 py-1 rounded text-xs border flex items-center gap-1 transition-all ${
                exploded ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Exploded view"
            >
              <Split className="w-3.5 h-3.5" />
            </button>

            {/* Wireframe */}
            <button
              type="button"
              onClick={() => setWireframe((v) => !v)}
              className={`p-1.5 rounded text-xs border transition-all ${
                wireframe ? 'bg-sky-950 border-sky-600 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Wireframe mode"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-HEADER: CAMERA PRESETS & CYLINDER STROKE INDICATOR */}
        {/* ------------------------------------------------------------- */}
        <div className="px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 bg-slate-950/80 text-[10px] z-10">
          {/* Camera Presets Cluster */}
          <div className="flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-400 mr-1" />
            <span className="text-slate-500 mr-1 hidden sm:inline">VIEW:</span>
            {['ISOMETRIC', 'FRONT', 'SIDE', 'TOP'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-2 py-0.5 rounded transition-all ${
                  activePreset === preset
                    ? 'bg-sky-950 text-sky-200 border border-sky-500 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
            <button
              type="button"
              onClick={() => applyPreset('RESET')}
              className="p-0.5 text-slate-400 hover:text-sky-300 ml-1"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Cylinder Selector & 4-Stroke Indicator */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center p-0.5 rounded bg-slate-950/90 border border-slate-800">
              {['CYLINDER 1', 'CYLINDER 2', 'CYLINDER 3', 'CYLINDER 4'].map((cyl) => (
                <button
                  key={cyl}
                  type="button"
                  onClick={() => onSelectCylinder(cyl)}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    selectedCylinder === cyl
                      ? 'bg-sky-950 text-sky-200 border border-sky-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cyl.replace('CYLINDER ', 'CYL ')}
                </button>
              ))}
            </div>

            <div className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 shadow ${activeStroke.bg}`}>
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{selectedCylinder}:</span>
              <span className={activeStroke.color}>{activeStroke.name}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MAIN BODY: 3D VIEWPORT (FULL CONTAINER WIDTH & HEIGHT, CENTERED) */}
        {/* ------------------------------------------------------------- */}
        <div
          ref={canvasContainerRef}
          className="flex-1 relative w-full h-full min-h-[460px] cursor-grab active:cursor-grabbing bg-slate-950 overflow-hidden"
          style={{ width: '100%', height: '100%' }}
        >
          <Canvas
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'block',
            }}
            dpr={[1, 2]}
            camera={{ position: [3.1, 1.7, 3.1], fov: 38 }}
            shadows
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            onPointerMissed={() => {
              onSelectPart(null);
            }}
            onCreated={({ gl, camera, size }) => {
              gl.setClearColor(new THREE.Color('#020617'));
              if (size.width > 0 && size.height > 0) {
                gl.setSize(size.width, size.height, false);
                if (camera.isPerspectiveCamera) {
                  camera.aspect = size.width / size.height;
                  camera.updateProjectionMatrix();
                }
              }
            }}
          >
            <ambientLight intensity={1.1} />
            <directionalLight position={[6, 8, 5]} intensity={1.8} castShadow />
            <directionalLight position={[-6, 6, -5]} intensity={1.2} />
            <directionalLight position={[0, -5, 4]} intensity={0.8} />
            <pointLight position={[0, 4, 0]} intensity={1.0} />

            <AeroPistonEngineWorkingAssembly
              selectedPartId={selectedPartId}
              activePartId={activePartId}
              onSelectPart={onSelectPart}
              selectedCylinder={selectedCylinder}
              telemetry={telemetry}
              digitalTwin={digitalTwin}
              ai={ai}
              wireframe={wireframe}
              thermalMap={thermalMap}
              isCutaway={isCutaway}
              exploded={exploded}
              showNames={showNames}
              showAirFuel={showAirFuel}
              showExhaust={showExhaust}
              showIgnition={showIgnition}
              showOil={showOil}
              showCooling={showCooling}
              isPlaying={isPlaying}
              stepTrigger={stepTrigger}
              playbackSpeed={playbackSpeed}
              onCycleUpdate={setCurrentDeg}
            />

            <ResponsiveViewportManager
              controlsRef={controlsRef}
              containerRef={canvasContainerRef}
            />

            <CameraPresetHandler
              controlsRef={controlsRef}
              cameraTarget={cameraTarget}
              onPresetDone={() => setCameraTarget(null)}
            />

            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping
              dampingFactor={0.08}
              target={[0, 0, 0]}
              minDistance={1.2}
              maxDistance={9.0}
            />
          </Canvas>

          {/* Compact Diagnostic Card: Placed beside 3D viewport without covering the engine */}
          {activeCardPart && (
            <CompactDiagnosticCard
              part={activeCardPart}
              faultDetails={activeCardFaultDetails}
              onClose={() => {
                onSelectPart(null);
                setDismissedPartId(activeCardPart.id);
              }}
            />
          )}

          {/* Canvas Bottom Bar: Playback & Flow Toggles */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
            {/* Playback Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur px-2 py-1 rounded border border-slate-800 pointer-events-auto text-xs">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300"
                title={isPlaying ? 'Pause simulation' : 'Resume simulation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setStepTrigger((c) => c + 1);
                }}
                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800 flex items-center gap-1 font-bold"
                title="Step forward 90 degrees"
              >
                <SkipForward className="w-3 h-3 text-sky-400" />
                <span>STEP +90°</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  crankAngleRef.current = 0;
                  setCurrentDeg(0);
                }}
                className="p-1 rounded hover:bg-slate-800 text-slate-400"
                title="Reset cycle to 0 deg TDC"
              >
                <RotateCcw className="w-3 h-3" />
              </button>

              <div className="hidden sm:flex items-center gap-1 ml-1 text-[10px] text-slate-400">
                <span>{playbackSpeed.toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-16 accent-sky-400 cursor-pointer"
                  title="Playback Speed Multiplier"
                />
              </div>
            </div>

            {/* Fluid & Electrical Flow Toggles */}
            <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur px-2 py-1 rounded border border-slate-800 pointer-events-auto text-[10px]">
              <span className="text-slate-500 mr-1 hidden sm:inline">FLOWS:</span>
              <button
                type="button"
                onClick={() => setShowAirFuel((v) => !v)}
                className={`px-1.5 py-0.5 rounded border transition-all ${
                  showAirFuel ? 'bg-sky-950 border-sky-600 text-sky-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                AIR/FUEL {showAirFuel ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowIgnition((v) => !v)}
                className={`px-1.5 py-0.5 rounded border transition-all ${
                  showIgnition ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                IGNITION {showIgnition ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowExhaust((v) => !v)}
                className={`px-1.5 py-0.5 rounded border transition-all ${
                  showExhaust ? 'bg-orange-950 border-orange-600 text-orange-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                EXHAUST {showExhaust ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowOil((v) => !v)}
                className={`px-1.5 py-0.5 rounded border transition-all ${
                  showOil ? 'bg-yellow-950 border-yellow-600 text-yellow-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                OIL {showOil ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowCooling((v) => !v)}
                className={`px-1.5 py-0.5 rounded border transition-all ${
                  showCooling ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                COOLING {showCooling ? '✓' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </WebGLErrorBoundary>
  );
}
