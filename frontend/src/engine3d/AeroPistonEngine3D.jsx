import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
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
  Gauge
} from 'lucide-react';
import WebGLErrorBoundary from './WebGLErrorBoundary';
import { ENGINE_PARTS, getComponentStatus } from './enginePartsData';

/**
 * Procedural Aero Piston Engine (Rotax 914 / 915 Boxer-4 Style)
 * Unified Kinematic Mechanical Simulation:
 * - Single master crank angle drives crankshaft, connecting rods, pistons, and propeller
 * - Visual 4-stroke cycle (INTAKE, COMPRESSION, POWER, EXHAUST)
 * - Animated intake and exhaust valves opening and closing
 * - Spark ignition flash & combustion glow during POWER stroke
 * - Animated flow pathways: Air/Fuel, Exhaust, Oil lubrication, and Cooling airflow
 * - Cutaway mode revealing moving internal mechanical parts
 * - Interactive step-by-step judge inspection mode
 */
function AeroPistonEngineWorkingAssembly({
  selectedPartId,
  onSelectPart,
  selectedCylinder,
  telemetry = {},
  digitalTwin = {},
  wireframe = false,
  thermalMap = false,
  isCutaway = true,
  exploded = false,
  showLabels = true,
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

  // Mechanical kinematic dimensions
  const crankRadius = 0.26;
  const rodLength = 0.76;
  const baseOffset = 0.65;
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
      // Advance master crank angle (radians)
      const radSpeed = (activeRpm / 60) * Math.PI * 2 * playbackSpeed * delta;
      crankAngleRef.current += radSpeed;
    }

    const theta = crankAngleRef.current;
    // 720 degree cycle (4 strokes = 4 * PI radians)
    const cycleAngle = theta % (Math.PI * 4);
    const degCycle = ((cycleAngle / (Math.PI * 4)) * 720) % 720;

    // Report active stroke for selected cylinder
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

    // 3. KINEMATIC SLIDER-CRANK MECHANISM FOR 4 OPPOSED CYLINDERS
    // Firing order: Cyl 1 (0°), Cyl 3 (180°), Cyl 2 (360°), Cyl 4 (540°)
    // Left Bank: Cyl 1 (Z = +0.45), Cyl 2 (Z = -0.45) along -X axis
    // Right Bank: Cyl 3 (Z = +0.45), Cyl 4 (Z = -0.45) along +X axis

    // Left Bank Crankpin offset (phase theta)
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    // Left Piston Position along -X
    const underRadL = Math.max(0, rodLength * rodLength - (crankRadius * sinTheta) * (crankRadius * sinTheta));
    const dispL = crankRadius * cosTheta + Math.sqrt(underRadL);
    const xPosL = -(baseOffset + dispL + explodeFactor * 0.8);
    const rodAngleL = Math.asin((crankRadius * sinTheta) / rodLength);

    // Right Bank Crankpin offset (180 deg out-of-phase Boxer)
    const underRadR = Math.max(0, rodLength * rodLength - (-crankRadius * sinTheta) * (-crankRadius * sinTheta));
    const dispR = -crankRadius * cosTheta + Math.sqrt(underRadR);
    const xPosR = +(baseOffset + dispR + explodeFactor * 0.8);
    const rodAngleR = Math.asin((-crankRadius * sinTheta) / rodLength);

    // Update Left Pistons & Connecting Rods
    if (piston1Ref.current) piston1Ref.current.position.x = xPosL;
    if (piston2Ref.current) piston2Ref.current.position.x = xPosL;

    if (rod1Ref.current) {
      rod1Ref.current.position.x = -(baseOffset + 0.15 + (dispL * 0.5));
      rod1Ref.current.rotation.z = rodAngleL;
    }
    if (rod2Ref.current) {
      rod2Ref.current.position.x = -(baseOffset + 0.15 + (dispL * 0.5));
      rod2Ref.current.rotation.z = rodAngleL;
    }

    // Update Right Pistons & Connecting Rods
    if (piston3Ref.current) piston3Ref.current.position.x = xPosR;
    if (piston4Ref.current) piston4Ref.current.position.x = xPosR;

    if (rod3Ref.current) {
      rod3Ref.current.position.x = +(baseOffset + 0.15 + (dispR * 0.5));
      rod3Ref.current.rotation.z = rodAngleR;
    }
    if (rod4Ref.current) {
      rod4Ref.current.position.x = +(baseOffset + 0.15 + (dispR * 0.5));
      rod4Ref.current.rotation.z = rodAngleR;
    }

    // 4. VALVE ACTUATION & 4-STROKE CYCLE FOR EACH CYLINDER
    const updateCylinderValvesAndSpark = (degOffset, inRef, exRef, sparkRef, isLeft) => {
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
      // STROKE 3: POWER (360° - 540°) -> Spark plug fires at 360° - 390°
      if (localDeg >= 360 && localDeg < 410) {
        sparkIntensity = 1.0 - (localDeg - 360) / 50;
      }

      const sign = isLeft ? 1 : -1;
      if (inRef.current) inRef.current.position.x = sign * inLift;
      if (exRef.current) exRef.current.position.x = sign * exLift;

      if (sparkRef.current) {
        sparkRef.current.visible = showIgnition && sparkIntensity > 0.05;
        if (sparkRef.current.material) {
          sparkRef.current.material.opacity = sparkIntensity;
        }
      }
    };

    updateCylinderValvesAndSpark(0, inValve1Ref, exValve1Ref, spark1Ref, true);
    updateCylinderValvesAndSpark(360, inValve2Ref, exValve2Ref, spark2Ref, true);
    updateCylinderValvesAndSpark(180, inValve3Ref, exValve3Ref, spark3Ref, false);
    updateCylinderValvesAndSpark(540, inValve4Ref, exValve4Ref, spark4Ref, false);

    // 5. ANIMATE FLOW STREAMS (Particles / Visual Beams)
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
  });

  // Dynamic status and materials generator
  const getMaterial = (partId, defaultProps, options = {}) => {
    const isSelected = selectedPartId === partId;
    const isHovered = hoveredPartId === partId;

    let baseColor = defaultProps.color;
    let emissiveColor = '#000000';
    let emissiveIntensity = 0.0;
    let opacity = defaultProps.opacity !== undefined ? defaultProps.opacity : 1.0;
    let transparent = defaultProps.transparent || false;

    // Cutaway transparency for crankcase and cylinder barrels
    if (isCutaway && options.allowCutaway) {
      transparent = true;
      opacity = 0.32;
    }

    // Thermal map mode
    if (thermalMap && options.thermalResponsive) {
      const part = ENGINE_PARTS.find((p) => p.id === partId);
      if (part) {
        const pStatus = getComponentStatus(part, telemetry, digitalTwin);
        if (pStatus === 'CRITICAL') {
          baseColor = '#ef4444';
          emissiveColor = '#ef4444';
          emissiveIntensity = 0.55;
        } else if (pStatus === 'WARNING') {
          baseColor = '#f59e0b';
          emissiveColor = '#f59e0b';
          emissiveIntensity = 0.4;
        } else {
          baseColor = '#10b981';
          emissiveColor = '#10b981';
          emissiveIntensity = 0.2;
        }
      }
    }

    // Selection highlight
    if (isSelected) {
      emissiveColor = '#38bdf8';
      emissiveIntensity = 0.65;
      baseColor = '#0284c7';
    } else if (isHovered) {
      emissiveColor = '#38bdf8';
      emissiveIntensity = 0.35;
    }

    return new THREE.MeshStandardMaterial({
      ...defaultProps,
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity,
      transparent,
      opacity,
      wireframe,
      roughness: defaultProps.roughness !== undefined ? defaultProps.roughness : 0.3,
      metalness: defaultProps.metalness !== undefined ? defaultProps.metalness : 0.8,
    });
  };

  // Materials
  const crankcaseMat = getMaterial(
    'crankcase',
    { color: '#1e293b', metalness: 0.85, roughness: 0.35 },
    { allowCutaway: true }
  );
  const cylinderMat = getMaterial(
    'cylinder_1',
    { color: '#475569', metalness: 0.8, roughness: 0.35 },
    { allowCutaway: true }
  );
  const headMat = getMaterial(
    'cylinder_head',
    { color: '#cbd5e1', metalness: 0.9, roughness: 0.2 },
    { thermalResponsive: true }
  );
  const pistonMat = getMaterial('piston', {
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.15,
  });
  const rodMat = getMaterial('connecting_rod', {
    color: '#94a3b8',
    metalness: 0.9,
    roughness: 0.25,
  });
  const crankshaftMat = getMaterial('crankshaft', {
    color: '#cbd5e1',
    metalness: 0.92,
    roughness: 0.2,
  });
  const propHubMat = getMaterial('propeller_hub', {
    color: '#475569',
    metalness: 0.85,
    roughness: 0.3,
  });
  const propellerMat = getMaterial('propeller', {
    color: '#0f172a',
    metalness: 0.8,
    roughness: 0.35,
  });
  const finMat = getMaterial('cooling_fins', {
    color: '#94a3b8',
    metalness: 0.75,
    roughness: 0.3,
  });
  const inValveMat = getMaterial('intake_valve', {
    color: '#38bdf8',
    metalness: 0.9,
    roughness: 0.2,
  });
  const exValveMat = getMaterial('exhaust_valve', {
    color: '#ea580c',
    metalness: 0.9,
    roughness: 0.2,
    emissive: '#9a3412',
    emissiveIntensity: 0.3,
  });
  const sparkMat = getMaterial('spark_plug', {
    color: '#f87171',
    metalness: 0.7,
    roughness: 0.3,
  });
  const fuelSysMat = getMaterial('fuel_system', {
    color: '#dc2626',
    metalness: 0.6,
    roughness: 0.4,
  });
  const intakeMat = getMaterial('intake_manifold', {
    color: '#ea580c',
    metalness: 0.7,
    roughness: 0.35,
  });
  const exhaustMat = getMaterial(
    'exhaust_manifold',
    { color: '#78350f', metalness: 0.85, roughness: 0.3 },
    { thermalResponsive: true }
  );
  const oilSysMat = getMaterial('oil_system', {
    color: '#ca8a04',
    metalness: 0.75,
    roughness: 0.3,
  });
  const oilFilterMat = getMaterial('oil_filter', {
    color: '#eab308',
    metalness: 0.65,
    roughness: 0.35,
  });

  const handlePointer = (e, partId) => {
    e.stopPropagation();
    onSelectPart(partId);
  };

  return (
    <group ref={groupRef}>
      {/* ------------------------------------------------------------- */}
      {/* 1. CRANKCASE HOUSING (With Cutaway Transparency) */}
      {/* ------------------------------------------------------------- */}
      <mesh
        material={crankcaseMat}
        position={[0, 0, 0]}
        castShadow
        receiveShadow
        onClick={(e) => handlePointer(e, 'crankcase')}
        onPointerOver={() => setHoveredPartId('crankcase')}
        onPointerOut={() => setHoveredPartId(null)}
      >
        <boxGeometry args={[1.36, 1.15, 2.3]} />
      </mesh>

      {/* Top Deck Spine */}
      <mesh
        material={crankcaseMat}
        position={[0, 0.65, 0]}
        onClick={(e) => handlePointer(e, 'crankcase')}
      >
        <boxGeometry args={[0.88, 0.16, 2.0]} />
      </mesh>

      {/* ------------------------------------------------------------- */}
      {/* 2. ROTATING CRANKSHAFT & CRANKPINS */}
      {/* ------------------------------------------------------------- */}
      <group ref={crankshaftRef} position={[0, 0, 0]}>
        {/* Main Center Shaft */}
        <mesh material={crankshaftMat} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 2.4, 24]} />
        </mesh>

        {/* Counterweights & Offset Crankpin Journals */}
        {[-0.45, 0.45].map((zPos, idx) => (
          <group key={idx} position={[0, 0, zPos]}>
            {/* Counterweight Web */}
            <mesh material={crankshaftMat} position={[0, idx === 0 ? 0.22 : -0.22, 0]}>
              <boxGeometry args={[0.42, 0.28, 0.16]} />
            </mesh>
            {/* Offset Crankpin */}
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

      {/* ------------------------------------------------------------- */}
      {/* 3. PROPELLER & REDUCTION GEARBOX (PRGB) */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, 0.1, 1.35 + explodeFactor * 0.8]}>
        {/* Gearbox Housing */}
        <mesh
          material={propHubMat}
          position={[0, 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          onClick={(e) => handlePointer(e, 'propeller_hub')}
        >
          <cylinderGeometry args={[0.48, 0.62, 0.48, 24]} />
        </mesh>

        {/* Rotating Spinner Hub & Blades */}
        <group ref={propHubRef} position={[0, 0, 0.38]}>
          <mesh
            material={propHubMat}
            position={[0, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            onClick={(e) => handlePointer(e, 'propeller_hub')}
          >
            <cylinderGeometry args={[0.36, 0.36, 0.18, 24]} />
          </mesh>
          <mesh
            material={propHubMat}
            position={[0, 0, 0.18]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.36, 0.38, 24]} />
          </mesh>

          {/* 3 Aerodynamic Carbon Blades */}
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
                <boxGeometry args={[0.16, 2.2, 0.04]} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 4. LEFT BANK (CYLINDERS 1 & 2) */}
      {/* ------------------------------------------------------------- */}
      <group position={[-explodeFactor * 1.0, 0, 0]}>
        {/* Cylinders 1 & 2 Barrels */}
        {[0.45, -0.45].map((zPos, idx) => (
          <group key={idx} position={[-1.15, 0.05, zPos]}>
            <mesh
              material={cylinderMat}
              rotation={[0, 0, Math.PI / 2]}
              onClick={(e) => handlePointer(e, idx === 0 ? 'cylinder_1' : 'cylinder_2')}
            >
              <cylinderGeometry args={[0.38, 0.4, 0.9, 20]} />
            </mesh>

            {/* Cooling Fins */}
            {[-0.3, -0.15, 0, 0.15, 0.3].map((fPos, fIdx) => (
              <mesh
                key={fIdx}
                material={finMat}
                position={[fPos, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                onClick={(e) => handlePointer(e, 'cooling_fins')}
              >
                <cylinderGeometry args={[0.48, 0.48, 0.03, 20]} />
              </mesh>
            ))}

            {/* Cylinder Head */}
            <mesh
              material={headMat}
              position={[-0.58 - explodeFactor * 0.4, 0, 0]}
              onClick={(e) => handlePointer(e, 'cylinder_head')}
            >
              <boxGeometry args={[0.28, 0.72, 0.78]} />
            </mesh>

            {/* Spark Plug */}
            <mesh
              material={sparkMat}
              position={[-0.58 - explodeFactor * 0.4, 0.42, 0]}
              onClick={(e) => handlePointer(e, 'spark_plug')}
            >
              <cylinderGeometry args={[0.05, 0.05, 0.16, 12]} />
            </mesh>

            {/* Intake Valve */}
            <group ref={idx === 0 ? inValve1Ref : inValve2Ref} position={[-0.55, 0.22, 0.15]}>
              <mesh material={inValveMat} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
              </mesh>
              <mesh material={inValveMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
              </mesh>
            </group>

            {/* Exhaust Valve */}
            <group ref={idx === 0 ? exValve1Ref : exValve2Ref} position={[-0.55, -0.22, -0.15]}>
              <mesh material={exValveMat} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
              </mesh>
              <mesh material={exValveMat} position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
              </mesh>
            </group>

            {/* Spark & Combustion Flash Light */}
            <pointLight
              ref={idx === 0 ? spark1Ref : spark2Ref}
              color="#fbbf24"
              intensity={2.5}
              distance={1.6}
              position={[-0.5, 0, 0]}
            />
          </group>
        ))}

        {/* Piston 1 & Connecting Rod 1 */}
        <mesh
          ref={piston1Ref}
          material={pistonMat}
          position={[-1.0, 0.05, 0.45]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) => handlePointer(e, 'piston')}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
        </mesh>
        <group ref={rod1Ref} position={[-0.6, 0.05, 0.45]}>
          <mesh material={rodMat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, rodLength, 12]} />
          </mesh>
        </group>

        {/* Piston 2 & Connecting Rod 2 */}
        <mesh
          ref={piston2Ref}
          material={pistonMat}
          position={[-1.0, 0.05, -0.45]}
          rotation={[0, 0, Math.PI / 2]}
          onClick={(e) => handlePointer(e, 'piston')}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
        </mesh>
        <group ref={rod2Ref} position={[-0.6, 0.05, -0.45]}>
          <mesh material={rodMat} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, rodLength, 12]} />
          </mesh>
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 5. RIGHT BANK (CYLINDERS 3 & 4) */}
      {/* ------------------------------------------------------------- */}
      <group position={[explodeFactor * 1.0, 0, 0]}>
        {/* Cylinders 3 & 4 Barrels */}
        {[0.45, -0.45].map((zPos, idx) => (
          <group key={idx} position={[1.15, 0.05, zPos]}>
            <mesh
              material={cylinderMat}
              rotation={[0, 0, -Math.PI / 2]}
              onClick={(e) => handlePointer(e, idx === 0 ? 'cylinder_3' : 'cylinder_4')}
            >
              <cylinderGeometry args={[0.38, 0.4, 0.9, 20]} />
            </mesh>

            {/* Cooling Fins */}
            {[-0.3, -0.15, 0, 0.15, 0.3].map((fPos, fIdx) => (
              <mesh
                key={fIdx}
                material={finMat}
                position={[-fPos, 0, 0]}
                rotation={[0, 0, -Math.PI / 2]}
                onClick={(e) => handlePointer(e, 'cooling_fins')}
              >
                <cylinderGeometry args={[0.48, 0.48, 0.03, 20]} />
              </mesh>
            ))}

            {/* Cylinder Head */}
            <mesh
              material={headMat}
              position={[0.58 + explodeFactor * 0.4, 0, 0]}
              onClick={(e) => handlePointer(e, 'cylinder_head')}
            >
              <boxGeometry args={[0.28, 0.72, 0.78]} />
            </mesh>

            {/* Spark Plug */}
            <mesh
              material={sparkMat}
              position={[0.58 + explodeFactor * 0.4, 0.42, 0]}
              onClick={(e) => handlePointer(e, 'spark_plug')}
            >
              <cylinderGeometry args={[0.05, 0.05, 0.16, 12]} />
            </mesh>

            {/* Intake Valve */}
            <group ref={idx === 0 ? inValve3Ref : inValve4Ref} position={[0.55, 0.22, 0.15]}>
              <mesh material={inValveMat} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
              </mesh>
              <mesh material={inValveMat} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
              </mesh>
            </group>

            {/* Exhaust Valve */}
            <group ref={idx === 0 ? exValve3Ref : exValve4Ref} position={[0.55, -0.22, -0.15]}>
              <mesh material={exValveMat} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.03, 0.03, 0.24, 12]} />
              </mesh>
              <mesh material={exValveMat} position={[0.12, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[0.12, 0.04, 0.04, 16]} />
              </mesh>
            </group>

            {/* Spark & Combustion Flash Light */}
            <pointLight
              ref={idx === 0 ? spark3Ref : spark4Ref}
              color="#fbbf24"
              intensity={2.5}
              distance={1.6}
              position={[0.5, 0, 0]}
            />
          </group>
        ))}

        {/* Piston 3 & Connecting Rod 3 */}
        <mesh
          ref={piston3Ref}
          material={pistonMat}
          position={[1.0, 0.05, 0.45]}
          rotation={[0, 0, -Math.PI / 2]}
          onClick={(e) => handlePointer(e, 'piston')}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
        </mesh>
        <group ref={rod3Ref} position={[0.6, 0.05, 0.45]}>
          <mesh material={rodMat} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, rodLength, 12]} />
          </mesh>
        </group>

        {/* Piston 4 & Connecting Rod 4 */}
        <mesh
          ref={piston4Ref}
          material={pistonMat}
          position={[1.0, 0.05, -0.45]}
          rotation={[0, 0, -Math.PI / 2]}
          onClick={(e) => handlePointer(e, 'piston')}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.34, 20]} />
        </mesh>
        <group ref={rod4Ref} position={[0.6, 0.05, -0.45]}>
          <mesh material={rodMat} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, rodLength, 12]} />
          </mesh>
        </group>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 6. FUEL & INDUCTION MANIFOLD */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, 0.8 + explodeFactor * 0.6, 0]}>
        <mesh material={fuelSysMat} rotation={[Math.PI / 2, 0, 0]} onClick={(e) => handlePointer(e, 'fuel_system')}>
          <cylinderGeometry args={[0.06, 0.06, 1.8, 12]} />
        </mesh>
        <mesh material={intakeMat} position={[-0.5, -0.15, 0]} rotation={[0, 0, 0.4]} onClick={(e) => handlePointer(e, 'intake_manifold')}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 12]} />
        </mesh>
        <mesh material={intakeMat} position={[0.5, -0.15, 0]} rotation={[0, 0, -0.4]} onClick={(e) => handlePointer(e, 'intake_manifold')}>
          <cylinderGeometry args={[0.07, 0.07, 1.1, 12]} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 7. EXHAUST & TURBOCHARGER */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, -0.55 - explodeFactor * 0.6, -1.35 - explodeFactor * 0.5]}>
        <mesh material={exhaustMat} rotation={[0, Math.PI / 2, 0]} onClick={(e) => handlePointer(e, 'exhaust_manifold')}>
          <torusGeometry args={[0.32, 0.15, 16, 24]} />
        </mesh>
        <mesh material={exhaustMat} position={[0.3, 0, 0.2]} rotation={[0.2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 12]} />
        </mesh>
        <mesh material={exhaustMat} position={[-0.3, 0, 0.2]} rotation={[-0.2, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.8, 12]} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 8. OIL SYSTEM & FILTER */}
      {/* ------------------------------------------------------------- */}
      <group position={[0, -0.7 - explodeFactor * 0.5, 0]}>
        <mesh material={oilSysMat} position={[0, 0, 0]} onClick={(e) => handlePointer(e, 'oil_system')}>
          <boxGeometry args={[1.1, 0.28, 1.8]} />
        </mesh>
        <mesh material={oilFilterMat} position={[0.5, -0.1, 0.6]} rotation={[0.3, 0, 0]} onClick={(e) => handlePointer(e, 'oil_filter')}>
          <cylinderGeometry args={[0.16, 0.16, 0.45, 16]} />
        </mesh>
      </group>

      {/* ------------------------------------------------------------- */}
      {/* 9. VISUAL FLOW STREAMS (OPTIONAL TOGGLES) */}
      {/* ------------------------------------------------------------- */}
      {/* Air / Fuel Flow Stream */}
      {showAirFuel && (
        <group ref={airFuelFlowRef} position={[0, 0.85, 0]}>
          {[-0.6, -0.3, 0, 0.3, 0.6].map((z, i) => (
            <mesh key={i} position={[0, 0, z]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          ))}
        </group>
      )}

      {/* Exhaust Gas Flow Stream */}
      {showExhaust && (
        <group ref={exhaustFlowRef} position={[0, -0.6, -1.2]}>
          {[0, -0.3, -0.6, -0.9].map((z, i) => (
            <mesh key={i} position={[0, 0, z]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshBasicMaterial color="#f97316" />
            </mesh>
          ))}
        </group>
      )}

      {/* Oil Lubrication Stream */}
      {showOil && (
        <group ref={oilFlowRef} position={[0, -0.5, 0]}>
          {[-0.5, 0, 0.5].map((x, i) => (
            <mesh key={i} position={[x, 0, 0]}>
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshBasicMaterial color="#facc15" />
            </mesh>
          ))}
        </group>
      )}

      {/* Cooling Airflow Streamlines */}
      {showCooling && (
        <group ref={coolingFlowRef} position={[0, 0.1, 1.2]}>
          {[-1.4, 1.4].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
              {[-0.4, 0, 0.4].map((y, j) => (
                <mesh key={j} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 2.4, 8]} />
                  <meshBasicMaterial
                    color={thermalMap ? '#ef4444' : '#38bdf8'}
                    transparent
                    opacity={0.4}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. 3D CALLOUT LABELS */}
      {/* ------------------------------------------------------------- */}
      {showLabels && (
        <group>
          <Html position={[0, 1.2, 1.5]} center distanceFactor={10}>
            <button
              type="button"
              onClick={() => onSelectPart('propeller')}
              className="px-2 py-0.5 rounded bg-slate-900/90 border border-sky-500 text-sky-300 text-[10px] font-mono shadow hover:bg-sky-950 cursor-pointer whitespace-nowrap"
            >
              PROPELLER & HUB
            </button>
          </Html>

          <Html position={[-1.7 - explodeFactor * 0.8, 0.8, 0.45]} center distanceFactor={10}>
            <button
              type="button"
              onClick={() => onSelectPart('cylinder_1')}
              className="px-2 py-0.5 rounded bg-slate-900/90 border border-sky-500 text-sky-300 text-[10px] font-mono shadow hover:bg-sky-950 cursor-pointer whitespace-nowrap"
            >
              CYLINDER 1
            </button>
          </Html>

          <Html position={[1.7 + explodeFactor * 0.8, 0.8, 0.45]} center distanceFactor={10}>
            <button
              type="button"
              onClick={() => onSelectPart('cylinder_3')}
              className="px-2 py-0.5 rounded bg-slate-900/90 border border-sky-500 text-sky-300 text-[10px] font-mono shadow hover:bg-sky-950 cursor-pointer whitespace-nowrap"
            >
              CYLINDER 3
            </button>
          </Html>

          <Html position={[0, 0.2, 0]} center distanceFactor={10}>
            <button
              type="button"
              onClick={() => onSelectPart('crankshaft')}
              className="px-2 py-0.5 rounded bg-slate-900/90 border border-emerald-500 text-emerald-300 text-[10px] font-mono shadow hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              CRANKSHAFT
            </button>
          </Html>

          <Html position={[0, -1.0 - explodeFactor * 0.5, -1.6]} center distanceFactor={10}>
            <button
              type="button"
              onClick={() => onSelectPart('exhaust_manifold')}
              className="px-2 py-0.5 rounded bg-slate-900/90 border border-rose-500 text-rose-300 text-[10px] font-mono shadow hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              EXHAUST / TURBO
            </button>
          </Html>
        </group>
      )}

      {/* Ground Grid */}
      <gridHelper args={[8, 16, '#38bdf8', '#1e293b']} position={[0, -1.4, 0]} />
    </group>
  );
}

/**
 * 3D Scene Controller & Lighting
 */
function SceneContent({
  selectedPartId,
  onSelectPart,
  selectedCylinder,
  telemetry,
  digitalTwin,
  wireframe,
  thermalMap,
  isCutaway,
  exploded,
  showLabels,
  showAirFuel,
  showExhaust,
  showIgnition,
  showOil,
  showCooling,
  isPlaying,
  stepTrigger,
  playbackSpeed,
  onCycleUpdate,
  controlsRef,
}) {
  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        autoRotate={false}
        minDistance={1.6}
        maxDistance={14.0}
        maxPolarAngle={Math.PI / 2 + 0.15}
      />

      {/* Multi-Directional Studio Lighting for High Visual Quality */}
      <ambientLight intensity={0.9} color="#e2e8f0" />
      <directionalLight position={[8, 10, 8]} intensity={1.8} color="#ffffff" castShadow />
      <directionalLight position={[-8, -4, -8]} intensity={0.9} color="#38bdf8" />
      <directionalLight position={[0, -6, 4]} intensity={0.6} color="#94a3b8" />
      <pointLight position={[0, 2.5, 0]} intensity={1.2} color="#38bdf8" distance={8} />

      <AeroPistonEngineWorkingAssembly
        selectedPartId={selectedPartId}
        onSelectPart={onSelectPart}
        selectedCylinder={selectedCylinder}
        telemetry={telemetry}
        digitalTwin={digitalTwin}
        wireframe={wireframe}
        thermalMap={thermalMap}
        isCutaway={isCutaway}
        exploded={exploded}
        showLabels={showLabels}
        showAirFuel={showAirFuel}
        showExhaust={showExhaust}
        showIgnition={showIgnition}
        showOil={showOil}
        showCooling={showCooling}
        isPlaying={isPlaying}
        stepTrigger={stepTrigger}
        playbackSpeed={playbackSpeed}
        onCycleUpdate={onCycleUpdate}
      />
    </>
  );
}

/**
 * AeroPistonEngine3D
 * Upgraded interactive working aero piston engine visualization
 */
export default function AeroPistonEngine3D({
  selectedPartId = 'cylinder_head',
  onSelectPart = () => {},
  selectedCylinder = 'CYLINDER 1',
  onSelectCylinder = () => {},
  telemetry = {},
  digitalTwin = {},
  isConnected = false,
  height = 560,
}) {
  const [wireframe, setWireframe] = useState(false);
  const [isCutaway, setIsCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [thermalMap, setThermalMap] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef();
  const controlsRef = useRef();

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
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

  return (
    <WebGLErrorBoundary height={height}>
      <div
        ref={containerRef}
        className="relative w-full rounded-lg bg-slate-950/95 border border-slate-800 overflow-hidden shadow-2xl flex flex-col select-none font-mono"
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        {/* Tech Grid */}
        <div className="absolute inset-0 tech-grid opacity-20 pointer-events-none" />

        {/* ------------------------------------------------------------- */}
        {/* TOP CONTROL & STATUS BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute top-0 inset-x-0 z-10 px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>3D DIGITAL TWIN // WORKING AERO PISTON ENGINE</span>
            </div>
            <span className="hidden lg:inline text-[10px] px-2 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400">
              Rotax 914 / 915 iS Turbocharged Boxer-4
            </span>
          </div>

          {/* Cylinder Selector Strip & Stroke Readout */}
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="flex items-center p-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px]">
              {['CYLINDER 1', 'CYLINDER 2', 'CYLINDER 3', 'CYLINDER 4'].map((cyl) => (
                <button
                  key={cyl}
                  type="button"
                  onClick={() => onSelectCylinder(cyl)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    selectedCylinder === cyl
                      ? 'bg-sky-950 text-sky-200 border border-sky-500 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cyl.replace('CYLINDER ', 'CYL ')}
                </button>
              ))}
            </div>

            {/* Active Stroke Display */}
            <div className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 shadow ${activeStroke.bg}`}>
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{selectedCylinder}:</span>
              <span className={activeStroke.color}>{activeStroke.name}</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* SUB-HEADER: 4-STROKE PROGRESS BAR & STEP-BY-STEP CONTROLS */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute top-11 inset-x-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* 4-Stroke Stage Stepper */}
          <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded border border-slate-800 pointer-events-auto text-[10px]">
            <span className="text-slate-500 mr-1">4-STROKE CYCLE:</span>
            {['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'].map((st) => (
              <span
                key={st}
                className={`px-1.5 py-0.5 rounded transition-all ${
                  activeStroke.name === st
                    ? 'bg-sky-500 text-slate-950 font-bold shadow'
                    : 'text-slate-500'
                }`}
              >
                {st}
              </span>
            ))}
          </div>

          {/* Stepper / Playback Controls */}
          <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur px-2 py-1 rounded border border-slate-800 pointer-events-auto text-xs">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="p-1 rounded hover:bg-slate-800 text-slate-300"
              title={isPlaying ? 'Pause engine' : 'Play engine'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStepTrigger((c) => c + 1);
              }}
              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800 flex items-center gap-1"
              title="Step forward 90 degrees"
            >
              <SkipForward className="w-3 h-3 text-sky-400" />
              <span>STEP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                crankAngleRef.current = 0;
                setCurrentDeg(0);
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400"
              title="Reset cycle to 0 deg"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* R3F THREE.JS CANVAS */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full h-full cursor-grab active:cursor-grabbing">
          <Canvas
            camera={{ position: [3.8, 2.6, 4.4], fov: 42 }}
            shadows
            gl={{ antialias: true, alpha: false }}
            onCreated={({ gl }) => {
              gl.setClearColor(new THREE.Color('#020617'));
            }}
          >
            <SceneContent
              selectedPartId={selectedPartId}
              onSelectPart={onSelectPart}
              selectedCylinder={selectedCylinder}
              telemetry={telemetry}
              digitalTwin={digitalTwin}
              wireframe={wireframe}
              thermalMap={thermalMap}
              isCutaway={isCutaway}
              exploded={exploded}
              showLabels={showLabels}
              showAirFuel={showAirFuel}
              showExhaust={showExhaust}
              showIgnition={showIgnition}
              showOil={showOil}
              showCooling={showCooling}
              isPlaying={isPlaying}
              stepTrigger={stepTrigger}
              playbackSpeed={playbackSpeed}
              onCycleUpdate={(deg) => setCurrentDeg(deg)}
              controlsRef={controlsRef}
            />
          </Canvas>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM TOOLBAR: FLOW TOGGLES & MODES */}
        {/* ------------------------------------------------------------- */}
        <div className="absolute bottom-2.5 inset-x-4 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Flow Toggles */}
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur px-2 py-1 rounded border border-slate-800 pointer-events-auto text-[10px]">
            <span className="text-slate-500 mr-1 hidden sm:inline">FLOWS:</span>
            <button
              type="button"
              onClick={() => setShowAirFuel((v) => !v)}
              className={`px-1.5 py-0.5 rounded border transition-all ${
                showAirFuel ? 'bg-sky-950 border-sky-600 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              AIR/FUEL
            </button>
            <button
              type="button"
              onClick={() => setShowExhaust((v) => !v)}
              className={`px-1.5 py-0.5 rounded border transition-all ${
                showExhaust ? 'bg-orange-950 border-orange-600 text-orange-300' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              EXHAUST
            </button>
            <button
              type="button"
              onClick={() => setShowIgnition((v) => !v)}
              className={`px-1.5 py-0.5 rounded border transition-all ${
                showIgnition ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              IGNITION
            </button>
            <button
              type="button"
              onClick={() => setShowOil((v) => !v)}
              className={`px-1.5 py-0.5 rounded border transition-all ${
                showOil ? 'bg-yellow-950 border-yellow-600 text-yellow-300' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              OIL
            </button>
            <button
              type="button"
              onClick={() => setShowCooling((v) => !v)}
              className={`px-1.5 py-0.5 rounded border transition-all ${
                showCooling ? 'bg-emerald-950 border-emerald-600 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              COOLING
            </button>
          </div>

          {/* View Modes & Standard Actions */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur px-2 py-1 rounded border border-slate-800 pointer-events-auto text-xs">
            {/* Cutaway Toggle */}
            <button
              type="button"
              onClick={() => setIsCutaway((v) => !v)}
              className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 transition-all ${
                isCutaway ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
              title="Toggle cutaway view of pistons and crankshaft"
            >
              <Eye className="w-3 h-3" />
              <span>CUTAWAY</span>
            </button>

            {/* Thermal Map */}
            <button
              type="button"
              onClick={() => setThermalMap((v) => !v)}
              className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 transition-all ${
                thermalMap ? 'bg-rose-950 border-rose-600 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="hidden sm:inline">THERMAL</span>
            </button>

            {/* Exploded Assembly */}
            <button
              type="button"
              onClick={() => setExploded((v) => !v)}
              className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 transition-all ${
                exploded ? 'bg-amber-950 border-amber-600 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Split className="w-3 h-3" />
              <span className="hidden sm:inline">EXPLODE</span>
            </button>

            {/* Wireframe */}
            <button
              type="button"
              onClick={() => setWireframe((v) => !v)}
              className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 transition-all ${
                wireframe ? 'bg-sky-950 border-sky-600 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Layers className="w-3 h-3" />
            </button>

            {/* Reset Camera */}
            <button
              type="button"
              onClick={resetCamera}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 rounded text-slate-400 hover:text-white"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-slate-600 pointer-events-none hidden xl:block">
          EDUCATIONAL KINEMATIC SIMULATION // VISUAL REPRESENTATION OF AERO PISTON 4-STROKE CYCLE
        </div>
      </div>
    </WebGLErrorBoundary>
  );
}
