import React, { useState, useEffect, useRef, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { useFleet } from '../hooks/useFleet';
import {
  deriveRtbFromUavState,
  setUavRtbCompleted,
  isUavRtbCompleted,
  commandSimulatedRtb,
  isSimulatedRtbActive,
  clearSimulatedRtb,
} from '../hooks/useRtb';
import {
  Navigation,
  Radio,
  Crosshair,
  Compass,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Plane,
  X,
  Shield,
  Layers,
  Activity,
  Home,
  MapPin,
  Thermometer,
  Droplets,
  Mountain,
} from 'lucide-react';

// 3 Selectable Simulated Map Scenarios (Operating Areas)
export const SIMULATED_OPERATING_AREAS = [
  {
    id: 'KONKAN_COAST',
    name: 'KONKAN COAST — INDIA',
    shortName: 'KONKAN COAST',
    environmentTag: 'COASTAL / HUMID SCENARIO',
    description: 'Western coastal maritime patrol corridor with elevated relative humidity and tropical marine airmass.',
    datum: 'WGS-84 / UTM ZONE 43N',
    theater: 'THEATER WEST // MARITIME RECON',
    homeBaseName: 'HOME BASE — INS HANSA (GOA)',
    homeBaseCallsign: 'COASTAL DEFENCE AIRBASE // RUNWAY 26',
    homeBaseCoords: '15°22\'N 073°50\'E',
    environmentalProfile: {
      climate: 'TROPICAL MARITIME',
      humidity: '84% RH (HIGH HUMIDITY)',
      ambientTemp: '31.5°C',
      pressureAlt: '120 m MSL',
      atmosphericCondition: 'COASTAL / HUMID',
    },
    sectors: {
      alpha: 'SEC-GOA N',
      bravo: 'SEC-KARWAR',
      charlie: 'SEC-OFFSHORE-S',
      delta: 'SEC-OFFSHORE-W',
      echo: 'SEC-PANJI COAST',
    },
    colorTint: {
      glow1: '#0ea5e9',
      glow2: '#0369a1',
      ringColor: '#38bdf8',
      accentColor: '#38bdf8',
      buttonActiveClass: 'bg-sky-500/20 text-sky-300 border-sky-500/60 shadow-[0_0_12px_rgba(14,165,233,0.3)]',
    },
  },
  {
    id: 'THAR_DESERT',
    name: 'THAR DESERT — INDIA',
    shortName: 'THAR DESERT',
    environmentTag: 'HOT / DRY SCENARIO',
    description: 'Northwestern arid desert sector with severe ambient thermal loading and fine silica particulate ingestion risk.',
    datum: 'WGS-84 / UTM ZONE 42N',
    theater: 'THEATER NORTHWEST // ARID DESERT BORDER',
    homeBaseName: 'HOME BASE — AFS JAISALMER',
    homeBaseCallsign: 'DESERT TACTICAL WING // RUNWAY 04',
    homeBaseCoords: '26°53\'N 070°51\'E',
    environmentalProfile: {
      climate: 'HYPER-ARID DESERT',
      humidity: '16% RH (ARID DRY)',
      ambientTemp: '44.8°C (EXTREME THERMAL)',
      pressureAlt: '225 m MSL',
      atmosphericCondition: 'HOT / DRY',
    },
    sectors: {
      alpha: 'SEC-POKHRAN N',
      bravo: 'SEC-BIKANER E',
      charlie: 'SEC-BARMER S',
      delta: 'SEC-BORDER W',
      echo: 'SEC-DUNES CENTRAL',
    },
    colorTint: {
      glow1: '#f59e0b',
      glow2: '#b45309',
      ringColor: '#fbbf24',
      accentColor: '#fbbf24',
      buttonActiveClass: 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    },
  },
  {
    id: 'LADAKH_HIGH_ALTITUDE',
    name: 'LADAKH HIGH-ALTITUDE — INDIA',
    shortName: 'LADAKH HIGH-ALTITUDE',
    environmentTag: 'HIGH-ALTITUDE / COLD SCENARIO',
    description: 'Trans-Himalayan extreme high-altitude mountain corridor with sub-zero freezing temperatures and reduced atmospheric density.',
    datum: 'WGS-84 / UTM ZONE 43N',
    theater: 'THEATER NORTH // HIGH-ALTITUDE MOUNTAIN',
    homeBaseName: 'HOME BASE — AFS LEH (KUSHOK BAKULA)',
    homeBaseCallsign: 'HIGH-ALTITUDE TACTICAL WING // RUNWAY 07',
    homeBaseCoords: '34°08\'N 077°32\'E',
    environmentalProfile: {
      climate: 'ALPINE SUB-ZERO / LOW O₂',
      humidity: '24% RH',
      ambientTemp: '-14.2°C (SUB-ZERO FREEZING)',
      pressureAlt: '3,256 m MSL (THIN AIR DENSITY)',
      atmosphericCondition: 'HIGH-ALTITUDE / COLD',
    },
    sectors: {
      alpha: 'SEC-NUBRA N',
      bravo: 'SEC-PANGONG E',
      charlie: 'SEC-INDUS S',
      delta: 'SEC-ZANSKAR SW',
      echo: 'SEC-KHARDUNG W',
    },
    colorTint: {
      glow1: '#6366f1',
      glow2: '#4338ca',
      ringColor: '#a5b4fc',
      accentColor: '#a5b4fc',
      buttonActiveClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
    },
  },
];

// Tactical fixed operational positions around Home Base (Stationary patrol sectors)
const UAV_TACTICAL_POSITIONS = {
  'UAV-001': {
    x: 32, // percentage from left
    y: 28, // percentage from top
    heading: 45,
    altitude: '4,500 m',
  },
  'UAV-002': {
    x: 70,
    y: 24,
    heading: 130,
    altitude: '3,800 m',
  },
  'UAV-003': {
    x: 76,
    y: 65,
    heading: 215,
    altitude: '4,200 m',
  },
  'UAV-004': {
    x: 38,
    y: 76,
    heading: 300,
    altitude: '4,000 m',
  },
  'UAV-005': {
    x: 18,
    y: 52,
    heading: 85,
    altitude: '2,400 m',
  },
};

// Home Base coordinates
const HOME_BASE_CENTER = {
  x: 50,
  y: 50,
};

/**
 * Patrol circuit waypoints for each simulated UAV.
 * All coordinates are map-% (0-100). Waypoints are visited in order and looped.
 * Speed is in map-% per animation frame at ~60 fps.
 * Paths are designed to:
 *   - Stay within 8–90% x and 8–88% y
 *   - Avoid Home Base centre (50%, 50%) by > 10%
 */
const UAV_PATROL_ROUTES = {
  'UAV-001': {
    // Northwest quadrant circuit
    waypoints: [
      { x: 14, y: 13 },
      { x: 36, y: 10 },
      { x: 42, y: 26 },
      { x: 28, y: 36 },
      { x: 11, y: 24 },
    ],
    speed: 0.050,
    startIdx: 0,
    initialHeading: 50,
  },
  'UAV-002': {
    // Northeast quadrant circuit
    waypoints: [
      { x: 66, y: 12 },
      { x: 81, y: 20 },
      { x: 86, y: 34 },
      { x: 72, y: 42 },
      { x: 60, y: 22 },
    ],
    speed: 0.040,
    startIdx: 1,
    initialHeading: 130,
  },
  'UAV-003': {
    // Southeast quadrant circuit
    waypoints: [
      { x: 75, y: 58 },
      { x: 84, y: 70 },
      { x: 70, y: 82 },
      { x: 58, y: 74 },
      { x: 63, y: 60 },
    ],
    speed: 0.055,
    startIdx: 2,
    initialHeading: 210,
  },
  'UAV-004': {
    // South-central circuit
    waypoints: [
      { x: 38, y: 72 },
      { x: 46, y: 82 },
      { x: 60, y: 78 },
      { x: 64, y: 64 },
      { x: 40, y: 62 },
    ],
    speed: 0.035,
    startIdx: 0,
    initialHeading: 300,
  },
  'UAV-005': {
    // West-central circuit
    waypoints: [
      { x: 10, y: 44 },
      { x: 20, y: 30 },
      { x: 32, y: 38 },
      { x: 26, y: 58 },
      { x: 10, y: 62 },
    ],
    speed: 0.045,
    startIdx: 3,
    initialHeading: 85,
  },
};

/** Sample a trail point every N animation frames */
const TRAIL_SAMPLE_EVERY = 4;
/** Maximum trail points per UAV */
const TRAIL_MAX_POINTS = 10;
/** Waypoint arrival threshold in map-% */
const WP_ARRIVAL_DIST = 1.6;
/** Physical RTB transit speed in map-% per second (~0.42% / sec -> ~60-120s for 25-50% distance) */
const RTB_SPEED_PER_SEC = 0.42;
/** Sample interval for trail points in seconds */
const TRAIL_SAMPLE_INTERVAL_SEC = 0.15;
/** RTB transit speed in map-% per animation frame at ~60 fps (RTB-04)
 * Intentionally slow: ~0.007 map-%/frame = ~0.42%/sec -> ~60-120s for 25-50% distance */
const RTB_SPEED = 0.007;
/** Home Base arrival distance threshold in map-% */
const RTB_ARRIVAL_DIST = 0.6;

/**
 * Deterministic orbital visual offsets around Home Base (radius ~3.5-4.2% map).
 * Keeps Home Base runway text & diamond anchor completely un-obscured
 * and ensures all parked/arrived UAVs have distinct, non-overlapping clickable markers.
 * Does NOT alter underlying simulation coordinates.
 */
const HOME_BASE_ORBIT_OFFSETS = {
  'UAV-001': { dx: -3.6, dy: -3.2 }, // Top-Left
  'UAV-002': { dx: 3.6, dy: -3.2 },  // Top-Right
  'UAV-003': { dx: 4.2, dy: 2.2 },   // Bottom-Right
  'UAV-004': { dx: -4.2, dy: 2.2 },  // Bottom-Left
  'UAV-005': { dx: 0.0, dy: -4.4 },  // Top-Center
};

/**
 * Staggered parameter t along route vector (distance fraction from UAV to Home Base).
 * Prevents multiple RTB route labels from piling up at the exact same midpoint.
 */
const RTB_STAGGER_T = {
  'UAV-001': 0.36,
  'UAV-002': 0.58,
  'UAV-003': 0.44,
  'UAV-004': 0.64,
  'UAV-005': 0.50,
};

/**
 * Computes optimal directional slot for a UAV's callsign pill
 * to prevent overlapping with nearby UAVs and Home Base.
 * Returns 'top' | 'bottom' | 'left' | 'right'
 */
function getLabelSlot(uavId, pos, allPositions) {
  if (!pos) return 'bottom';
  const distToHome = Math.hypot(HOME_BASE_CENTER.x - pos.x, HOME_BASE_CENTER.y - pos.y);
  if (distToHome <= 7.0) {
    // Near Home Base: radiate label away from Home Base center (50, 50)
    const dy = pos.y - HOME_BASE_CENTER.y;
    const dx = pos.x - HOME_BASE_CENTER.x;
    if (dy < -0.8) return 'top';
    if (dy > 0.8) return 'bottom';
    if (dx < 0) return 'left';
    return 'right';
  }

  // Check proximity against other UAVs
  if (allPositions) {
    for (const [otherId, otherPos] of Object.entries(allPositions)) {
      if (otherId === uavId || !otherPos) continue;
      const d = Math.hypot(otherPos.x - pos.x, otherPos.y - pos.y);
      if (d < 5.5) {
        // If neighbor is below, position label on top
        if (otherPos.y >= pos.y) return 'top';
        return 'bottom';
      }
    }
  }

  return 'bottom';
}

/**
 * Determine UAV status category:
 * - HEALTHY -> green
 * - WARNING / MEDIUM RISK -> yellow/orange
 * - FAULT / HIGH RISK -> red
 */
function getStatusCategory(uav) {
  if (!uav) return 'HEALTHY';
  const health = Number(uav.engine_health ?? 100);
  const risk = String(uav.mission_risk || 'LOW').toUpperCase();

  // FAULT / HIGH RISK: Health < 60% OR Mission Risk = HIGH/CRITICAL
  if (health < 60 || risk === 'HIGH' || risk === 'CRITICAL') {
    return 'FAULT';
  }
  // HEALTHY: Health >= 80% AND Mission Risk = LOW
  if (health >= 80 && risk === 'LOW') {
    return 'HEALTHY';
  }
  // WARNING: Health between 60% and 80% OR Mission Risk = MEDIUM
  return 'WARNING';
}

function getStatusTheme(status) {
  switch (status) {
    case 'FAULT':
      return {
        label: 'FAULT / HIGH RISK',
        color: '#f43f5e',
        textClass: 'text-rose-400',
        bgClass: 'bg-rose-500/20',
        borderClass: 'border-rose-500/40',
        badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400',
        icon: AlertOctagon,
      };
    case 'WARNING':
      return {
        label: 'WARNING / MEDIUM RISK',
        color: '#f59e0b',
        textClass: 'text-amber-400',
        bgClass: 'bg-amber-500/20',
        borderClass: 'border-amber-500/40',
        badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
        icon: AlertTriangle,
      };
    case 'HEALTHY':
    default:
      return {
        label: 'HEALTHY',
        color: '#10b981',
        textClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/20',
        borderClass: 'border-emerald-500/40',
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        icon: CheckCircle2,
      };
  }
}

export default function UavTrackingPage() {
  const { activeUavId, setActiveUavId, fleetData, uavCache, fleetUavIds } = useFleet();
  const [selectedPopupUavId, setSelectedPopupUavId] = useState(activeUavId || 'UAV-001');
  const [selectedAreaId, setSelectedAreaId] = useState('KONKAN_COAST');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [simulatedNoticeUav, setSimulatedNoticeUav] = useState(null);
  const [, setForceRtbRerender] = useState(0);

  const handleConfirmSimulatedRtb = () => {
    commandSimulatedRtb(activeUavId);
    setShowConfirmModal(false);
    setSimulatedNoticeUav(activeUavId);
    setForceRtbRerender((c) => c + 1);
  };

  const handleResetUavMission = (uavId) => {
    clearUavRtbCompleted(uavId);
    clearSimulatedRtb(uavId);
    if (simulatedNoticeUav === uavId) {
      setSimulatedNoticeUav(null);
    }
    if (animStateRef.current?.[uavId]) {
      const uavState = animStateRef.current[uavId];
      const route = UAV_PATROL_ROUTES[uavId] || UAV_PATROL_ROUTES['UAV-001'];
      const wp = route.waypoints[0];
      uavState.x = wp.x;
      uavState.y = wp.y;
      uavState.heading = route.initialHeading;
      uavState.waypointIdx = 0;
      uavState.trail = [];
      uavState.wasRtb = false;
      uavState.rtbCompleted = false;
    }
    setForceRtbRerender((c) => c + 1);
  };

  // ── Simulated UAV movement animation ──────────────────────────────────────
  // Mutable ref holding active RTB flags for each UAV so the RAF loop has synchronous zero-latency access (RTB-04)
  const rtbActiveMapRef = useRef({});

  // Direct DOM element references for high-performance 60 FPS visual interpolation without React re-render churn
  const markerDomRefs = useRef({});
  const iconDomRefs = useRef({});
  const rtbGlowDomRefs = useRef({});
  const rtbVectorDomRefs = useRef({});
  const rtbLabelDomRefs = useRef({});
  const lastTimeRef = useRef(null);
  const lastStateSyncRef = useRef(0);

  // animStateRef holds the MUTABLE animation state (not React state — avoids
  // stale-closure issues inside the RAF loop).
  const animStateRef = useRef(null);
  if (animStateRef.current === null) {
    const s = {};
    for (const [uavId, route] of Object.entries(UAV_PATROL_ROUTES)) {
      const wp = route.waypoints[route.startIdx];
      s[uavId] = {
        x: wp.x,
        y: wp.y,
        heading: route.initialHeading,
        waypointIdx: route.startIdx,
        trail: [],           // [{x, y}, ...]
        trailTimer: 0,
        wasRtb: false,
        rtbCompleted: false,
      };
    }
    animStateRef.current = s;
  }

  // animSnapshot is the React-state snapshot used for rendering (synchronized at 10 Hz to prevent 60 Hz React thrashing).
  const [animSnapshot, setAnimSnapshot] = useState(() => {
    const snap = {};
    for (const [uavId, route] of Object.entries(UAV_PATROL_ROUTES)) {
      const wp = route.waypoints[route.startIdx];
      snap[uavId] = { x: wp.x, y: wp.y, heading: route.initialHeading, trail: [], rtbCompleted: false };
    }
    return snap;
  });

  useEffect(() => {
    let frameId;

    const tick = () => {
      const now = performance.now();
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }
      // Clamped delta-time in seconds (bounded between 1ms and 50ms to prevent jumps on tab blur/resume)
      const dt = Math.min(Math.max((now - lastTimeRef.current) / 1000, 0.001), 0.05);
      lastTimeRef.current = now;

      const state = animStateRef.current;
      if (!state) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      for (const [uavId, route] of Object.entries(UAV_PATROL_ROUTES)) {
        const uavState = state[uavId];
        if (!uavState) continue;
        const isCompleted = isUavRtbCompleted(uavId) || Boolean(uavState.rtbCompleted);
        const isRtbActive = Boolean(rtbActiveMapRef.current?.[uavId]) && !isCompleted;

        if (isCompleted) {
          // ── RTB COMPLETE (RTB-05): Stopped at Home Base, keep marker parked, do not patrol ──
          uavState.x = HOME_BASE_CENTER.x;
          uavState.y = HOME_BASE_CENTER.y;
          uavState.rtbCompleted = true;
          if (!isUavRtbCompleted(uavId)) {
            setUavRtbCompleted(uavId, true);
          }
        } else if (isRtbActive) {
          // ── RTB MOVEMENT (RTB-04 & SMOOTH FIX): Constant controlled speed towards Home Base ──
          uavState.wasRtb = true;
          const dx = HOME_BASE_CENTER.x - uavState.x;
          const dy = HOME_BASE_CENTER.y - uavState.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > RTB_ARRIVAL_DIST) {
            // Move along the direct vector towards Home Base with elapsed-time physics
            const stepDist = RTB_SPEED_PER_SEC * dt;
            const moveDist = Math.min(stepDist, dist);
            const nx = dx / dist;
            const ny = dy / dist;
            uavState.x += nx * moveDist;
            uavState.y += ny * moveDist;
            uavState.rtbCompleted = false;

            // Smooth heading towards Home Base (0° = up/north on map)
            const targetHeading = (Math.atan2(dx, -dy) * 180) / Math.PI;
            const angleDiff = ((targetHeading - uavState.heading + 540) % 360) - 180;
            uavState.heading += angleDiff * Math.min(1.0, 2.5 * dt);

            // Sample trail at constant time intervals
            uavState.trailTimer = (uavState.trailTimer || 0) + dt;
            if (uavState.trailTimer >= TRAIL_SAMPLE_INTERVAL_SEC) {
              uavState.trailTimer = 0;
              uavState.trail = [
                ...uavState.trail.slice(-(TRAIL_MAX_POINTS - 1)),
                { x: uavState.x, y: uavState.y },
              ];
            }
          } else {
            // Reached Home Base (RTB-05): Clamp exactly, stop movement, do not oscillate
            uavState.x = HOME_BASE_CENTER.x;
            uavState.y = HOME_BASE_CENTER.y;
            uavState.rtbCompleted = true;
            setUavRtbCompleted(uavId, true);
          }
        } else {
          // ── NORMAL PATROL MOVEMENT: waypoint circuit ──
          uavState.rtbCompleted = false;
          // Re-synchronize when transitioning from RTB back to normal patrol
          if (uavState.wasRtb) {
            let closestIdx = 0;
            let minD = Infinity;
            route.waypoints.forEach((wp, idx) => {
              const d = Math.hypot(wp.x - uavState.x, wp.y - uavState.y);
              if (d < minD) {
                minD = d;
                closestIdx = idx;
              }
            });
            uavState.waypointIdx = closestIdx;
            uavState.wasRtb = false;
          }

          const target = route.waypoints[uavState.waypointIdx];
          const dx = target.x - uavState.x;
          const dy = target.y - uavState.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < WP_ARRIVAL_DIST) {
            // Advance to the next waypoint in the circuit
            uavState.waypointIdx = (uavState.waypointIdx + 1) % route.waypoints.length;
          } else {
            // Move toward the current target waypoint with elapsed-time physics
            const patrolSpeedPerSec = (route.speed || 0.045) * 60;
            const stepDist = patrolSpeedPerSec * dt;
            const moveDist = Math.min(stepDist, dist);
            const nx = dx / dist;
            const ny = dy / dist;
            uavState.x += nx * moveDist;
            uavState.y += ny * moveDist;

            // Smooth heading: target = angle from screen-up (0° = north on map)
            const targetHeading = (Math.atan2(dx, -dy) * 180) / Math.PI;
            const angleDiff = ((targetHeading - uavState.heading + 540) % 360) - 180;
            uavState.heading += angleDiff * Math.min(1.0, 3.5 * dt);

            // Sample trail at constant time intervals
            uavState.trailTimer = (uavState.trailTimer || 0) + dt;
            if (uavState.trailTimer >= TRAIL_SAMPLE_INTERVAL_SEC) {
              uavState.trailTimer = 0;
              uavState.trail = [
                ...uavState.trail.slice(-(TRAIL_MAX_POINTS - 1)),
                { x: uavState.x, y: uavState.y },
              ];
            }
          }
        }

        // ── Direct 60 FPS DOM Visual Updates (prevents React 60Hz render thrashing) ──
        // Compute visual position for DOM elements (preserves underlying uavState.x/y exactly)
        const distToHome = Math.hypot(HOME_BASE_CENTER.x - uavState.x, HOME_BASE_CENTER.y - uavState.y);
        let visualX = uavState.x;
        let visualY = uavState.y;

        // When near or arrived at Home Base, blend smoothly into non-overlapping orbital parking slot
        if (uavState.rtbCompleted || distToHome <= 3.0) {
          const orbit = HOME_BASE_ORBIT_OFFSETS[uavId] || { dx: 0, dy: 0 };
          const blend = uavState.rtbCompleted ? 1 : Math.max(0, 1 - distToHome / 3.0);
          visualX = uavState.x + orbit.dx * blend;
          visualY = uavState.y + orbit.dy * blend;
        }

        const markerEl = markerDomRefs.current[uavId];
        if (markerEl) {
          markerEl.style.left = `${visualX}%`;
          markerEl.style.top = `${visualY}%`;
        }

        const iconEl = iconDomRefs.current[uavId];
        if (iconEl) {
          iconEl.style.transform = `rotate(${uavState.heading}deg)`;
        }

        const glowEl = rtbGlowDomRefs.current[uavId];
        if (glowEl) {
          if (isCompleted || distToHome <= RTB_ARRIVAL_DIST) {
            glowEl.style.opacity = '0';
          } else {
            glowEl.style.opacity = '1';
            glowEl.setAttribute('x1', `${visualX}%`);
            glowEl.setAttribute('y1', `${visualY}%`);
          }
        }

        const vectorEl = rtbVectorDomRefs.current[uavId];
        if (vectorEl) {
          if (isCompleted || distToHome <= RTB_ARRIVAL_DIST) {
            vectorEl.style.opacity = '0';
          } else {
            vectorEl.style.opacity = '1';
            vectorEl.setAttribute('x1', `${visualX}%`);
            vectorEl.setAttribute('y1', `${visualY}%`);
          }
        }

        const labelEl = rtbLabelDomRefs.current[uavId];
        if (labelEl) {
          if (isCompleted || distToHome <= 5.0) {
            labelEl.style.display = 'none';
          } else {
            labelEl.style.display = 'block';
            const t = RTB_STAGGER_T[uavId] || 0.5;
            let lx = visualX + (HOME_BASE_CENTER.x - visualX) * t;
            let ly = visualY + (HOME_BASE_CENTER.y - visualY) * t;
            const dHome = Math.hypot(HOME_BASE_CENTER.x - lx, HOME_BASE_CENTER.y - ly);
            if (dHome < 7.0 && dHome > 0.001) {
              const scale = 7.0 / dHome;
              lx = HOME_BASE_CENTER.x - (HOME_BASE_CENTER.x - lx) * scale;
              ly = HOME_BASE_CENTER.y - (HOME_BASE_CENTER.y - ly) * scale;
            }
            labelEl.style.left = `${lx}%`;
            labelEl.style.top = `${ly}%`;
          }
        }
      }

      // ── Throttled React state synchronization (10 Hz / every 100ms) ──
      // Keeps SVG trails, boundary detection, and React state in sync without 60Hz re-renders
      if (now - lastStateSyncRef.current >= 100) {
        lastStateSyncRef.current = now;
        const nextSnap = {};
        for (const [uavId, s] of Object.entries(state)) {
          const dHome = Math.hypot(HOME_BASE_CENTER.x - s.x, HOME_BASE_CENTER.y - s.y);
          let vX = s.x;
          let vY = s.y;
          if (s.rtbCompleted || dHome <= 3.0) {
            const orbit = HOME_BASE_ORBIT_OFFSETS[uavId] || { dx: 0, dy: 0 };
            const blend = s.rtbCompleted ? 1 : Math.max(0, 1 - dHome / 3.0);
            vX = s.x + orbit.dx * blend;
            vY = s.y + orbit.dy * blend;
          }
          nextSnap[uavId] = {
            x: s.x,
            y: s.y,
            visualX: vX,
            visualY: vY,
            heading: s.heading,
            trail: s.trail,
            rtbCompleted: s.rtbCompleted,
          };
        }
        setAnimSnapshot(nextSnap);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []); // empty deps — RAF loop only starts once

  // Active simulated operating area
  const currentArea = SIMULATED_OPERATING_AREAS.find((a) => a.id === selectedAreaId) || SIMULATED_OPERATING_AREAS[0];

  // Build the live 5 UAV states from fleet context
  const uavList = (fleetUavIds || ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005']).map((id) => {
    const liveMatch = fleetData?.uavs?.find((u) => u.uav_id === id);
    const cachedMatch = uavCache?.[id];
    return liveMatch || cachedMatch || { uav_id: id };
  });

  // popupUav drives the popup card; activeUav drives the header banner.
  const popupUav = uavList.find((u) => u.uav_id === selectedPopupUavId) || uavList[0];
  const popupTheme = getStatusTheme(getStatusCategory(popupUav));

  // activeUav is ALWAYS derived from activeUavId — the single source of truth
  // for the "SHOWING DATA FOR" banner at the top of the page.
  const activeUav = uavList.find((u) => u.uav_id === activeUavId) || uavList[0];
  const activeUavTheme = getStatusTheme(getStatusCategory(activeUav));

  // Backend RTB decision state synchronization for all fleet UAV assets (RTB-03)
  const [backendRtbMap, setBackendRtbMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    const fetchAllRtb = async () => {
      try {
        const uavIds = (fleetUavIds && fleetUavIds.length > 0)
          ? fleetUavIds
          : ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005'];
        const results = await Promise.all(
          uavIds.map(async (id) => {
            try {
              const res = await rtbApi.getStatus(id);
              return [id, res];
            } catch {
              return [id, null];
            }
          })
        );
        if (isMounted) {
          const map = {};
          results.forEach(([id, res]) => {
            if (res) map[id] = res;
          });
          setBackendRtbMap(map);
        }
      } catch (err) {
        // Fallback to local synchronous derivation
      }
    };

    fetchAllRtb();
    const timer = setInterval(fetchAllRtb, 2000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [fleetUavIds]);

  // Compute active RTB UAVs dynamically from existing RTB-01 decision states (RTB-03, MAP UI-03 & RTB-06)
  const rtbActiveUavs = useMemo(() => {
    return uavList
      .map((uav) => {
        const uavId = uav.uav_id;
        const backendState = backendRtbMap[uavId];
        const derivedState = deriveRtbFromUavState(uav);
        const isManual = isSimulatedRtbActive(uavId);
        const rtbState = isManual
          ? { ...(backendState || {}), ...derivedState, rtb_active: true }
          : (backendState || derivedState);
        const isCompleted = isUavRtbCompleted(uavId) || Boolean(animSnapshot[uavId]?.rtbCompleted) || rtbState?.status === 'COMPLETE';
        const isRtbActive = Boolean(rtbState?.rtb_active) && !isCompleted;

        if (!isRtbActive || isCompleted) return null;

        const animPos = animSnapshot[uavId];
        const staticFallback = UAV_TACTICAL_POSITIONS[uavId] || { x: 50, y: 50, heading: 0 };
        const pos = animPos ? { x: animPos.x, y: animPos.y } : staticFallback;
        const visualPos = {
          x: animPos?.visualX ?? pos.x,
          y: animPos?.visualY ?? pos.y,
        };
        const distToHome = Math.hypot(HOME_BASE_CENTER.x - pos.x, HOME_BASE_CENTER.y - pos.y);
        const isArrived = distToHome <= RTB_ARRIVAL_DIST || isCompleted;
        if (isArrived) return null;

        // Staggered label positioning along route vector
        const t = RTB_STAGGER_T[uavId] || 0.5;
        let lx = visualPos.x + (HOME_BASE_CENTER.x - visualPos.x) * t;
        let ly = visualPos.y + (HOME_BASE_CENTER.y - visualPos.y) * t;
        const dHome = Math.hypot(HOME_BASE_CENTER.x - lx, HOME_BASE_CENTER.y - ly);
        if (dHome < 7.0 && dHome > 0.001) {
          const scale = 7.0 / dHome;
          lx = HOME_BASE_CENTER.x - (HOME_BASE_CENTER.x - lx) * scale;
          ly = HOME_BASE_CENTER.y - (HOME_BASE_CENTER.y - ly) * scale;
        }

        return {
          uavId,
          uav,
          pos,
          visualPos,
          labelPos: { x: lx, y: ly },
          rtbState,
          isSelected: uavId === activeUavId,
          isArrived,
          isManual,
        };
      })
      .filter(Boolean);
  }, [uavList, animSnapshot, activeUavId, backendRtbMap]);

  // Synchronize mutable rtbActiveMapRef on each render so RAF loop has zero-latency RTB state (RTB-04 & RTB-06)
  const rtbActiveSync = {};
  for (const u of uavList) {
    const uavId = u.uav_id;
    const backendState = backendRtbMap[uavId];
    const derived = deriveRtbFromUavState(u);
    const isManual = isSimulatedRtbActive(uavId);
    const isCompleted = isUavRtbCompleted(uavId) || Boolean(animSnapshot[uavId]?.rtbCompleted);
    const rtbState = isManual
      ? { ...(backendState || {}), ...derived, rtb_active: true }
      : (backendState || derived);
    rtbActiveSync[uavId] = Boolean(rtbState?.rtb_active) && !isCompleted;
  }
  rtbActiveMapRef.current = rtbActiveSync;

  // Derive active UAV RTB states for Banner and Command Button (RTB-06)
  const activeBackendRtb = backendRtbMap[activeUavId];
  const activeDerivedRtb = deriveRtbFromUavState(activeUav);
  const isActiveUavManual = isSimulatedRtbActive(activeUavId);
  const activeRtbState = isActiveUavManual
    ? { ...(activeBackendRtb || {}), ...activeDerivedRtb, rtb_active: true }
    : (activeBackendRtb || activeDerivedRtb);
  const isActiveUavCompleted = Boolean(
    isUavRtbCompleted(activeUavId) ||
    animSnapshot[activeUavId]?.rtbCompleted ||
    activeRtbState?.status === 'COMPLETE'
  );
  const isActiveUavRtbActive = Boolean(activeRtbState?.rtb_active) && !isActiveUavCompleted;

  // Handler to select UAV and toggle/open popup
  const handleMarkerClick = (uavId) => {
    setActiveUavId(uavId);
    setSelectedPopupUavId((prev) => (prev === uavId ? null : uavId));
  };

  return (
    <div className="space-y-2">
      {/* 1. Page Header with required titles & badges */}
      <PageHeader
        systemTag="AEROTWIN // TACTICAL AIRSPACE"
        title="UAV Tracking"
        description="Airspace tactical situational awareness display presenting simulated operational positions, mission risks, and live engine status across selectable simulated operating areas."
        className="pb-1 mb-1.5"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              UAV LIVE TRACKING
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800/90 text-slate-300 border border-slate-700 shadow-sm">
              SIMULATED TELEMETRY
            </span>
          </div>
        }
      />

      {/* 2. SIMULATED OPERATING AREA SELECTOR */}
      <div className="p-2 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 shadow-sm space-y-1.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5 pb-1 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                  SIMULATED OPERATING AREA
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SIMULATION SCENARIO ONLY
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-sky-300 bg-sky-500/10 border border-sky-500/30">
                  {currentArea.environmentTag}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5 leading-tight truncate md:whitespace-normal">
                {currentArea.description}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 self-start lg:self-auto shrink-0">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider">TELEMETRY:</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-semibold text-[10px]">
              SIMULATED TELEMETRY
            </span>
          </div>
        </div>

        {/* 3 Area Selector Segmented Buttons (1 Row on Desktop) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap hidden sm:inline">
            SELECT SCENARIO:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
            {SIMULATED_OPERATING_AREAS.map((area) => {
              const isSelected = area.id === selectedAreaId;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`py-1 px-2 rounded-lg text-left font-mono transition-all border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${area.colorTint.buttonActiveClass} ring-1 ring-offset-1 ring-offset-slate-950`
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold truncate">{area.name}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1.5 ${isSelected ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: area.colorTint.accentColor }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 font-normal truncate mt-0.5">
                    {area.environmentalProfile.atmosphericCondition}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Persistent Active UAV Context Banner */}
      <div className="py-1 px-2.5 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
            <Crosshair className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-[11px] font-mono font-bold text-slate-400 tracking-wider">
              SHOWING DATA FOR:
            </span>
            <span className="text-sm font-bold font-mono text-sky-400 tracking-wide">
              {activeUavId}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[9px] font-mono font-semibold">
              PHASE: {activeUav?.flight_phase || activeUav?.engine_telemetry?.flight_phase || 'CRUISE'}
            </span>
            {isActiveUavCompleted ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>RTB COMPLETE — ARRIVED AT HOME BASE</span>
              </span>
            ) : isActiveUavRtbActive && (isActiveUavManual || simulatedNoticeUav === activeUavId) ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/60 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>SIMULATED RTB ACTIVE — {activeUavId}</span>
              </span>
            ) : isActiveUavRtbActive ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/60 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>EMERGENCY RTB ACTIVE — {activeUavId}</span>
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${activeUavTheme.badgeBg}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1 ${activeUavTheme.dotClass}`} />
                {activeUavTheme.label}
              </span>
            )}
            <span className="text-[9px] font-mono text-slate-400 hidden md:inline">
              · AREA: <strong className="text-slate-200 font-bold">{currentArea.shortName}</strong>
            </span>
          </div>
        </div>

        {/* Right side: Quick UAV Selector and RTB-06 Command Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Quick UAV Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/80">
            <label htmlFor="tracking-uav-select" className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
              ACTIVE UAV:
            </label>
            <select
              id="tracking-uav-select"
              value={activeUavId}
              onChange={(e) => handleMarkerClick(e.target.value)}
              className="bg-transparent text-slate-100 font-mono text-[11px] font-bold focus:outline-none cursor-pointer"
              aria-label="Select Active UAV"
            >
              {uavList.map((uav) => (
                <option key={uav.uav_id} value={uav.uav_id} className="bg-slate-900 text-slate-100">
                  {uav.uav_id} ({getStatusCategory(uav)})
                </option>
              ))}
            </select>
          </div>

          {/* RTB-06: Operator Command Simulated RTB Button */}
          <button
            type="button"
            id="cmd-simulated-rtb-btn"
            onClick={() => setShowConfirmModal(true)}
            disabled={isActiveUavRtbActive || isActiveUavCompleted}
            title={
              isActiveUavCompleted
                ? `RTB Complete: ${activeUavId} has arrived at Home Base`
                : isActiveUavRtbActive
                  ? `RTB Active: ${activeUavId} is currently returning to Home Base`
                  : `Start simulated RTB demonstration for ${activeUavId} (Decision Support Demo Only)`
            }
            className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isActiveUavCompleted
                ? 'bg-slate-800/80 text-emerald-400/80 border border-emerald-500/30 cursor-not-allowed opacity-75'
                : isActiveUavRtbActive
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 cursor-not-allowed'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 hover:border-amber-400 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            }`}
            aria-label={`Command simulated RTB for ${activeUavId}`}
          >
            <span className="text-xs">↩</span>
            <span>COMMAND SIMULATED RTB</span>
          </button>

          {/* Reset button available when RTB is completed so operator can re-test mission patrol */}
          {isActiveUavCompleted && (
            <button
              type="button"
              id="reset-uav-mission-btn"
              onClick={() => handleResetUavMission(activeUavId)}
              title={`Reset ${activeUavId} to active mission patrol circuit`}
              className="px-2 py-1 rounded text-[9.5px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              ↺ RESET MISSION
            </button>
          )}
        </div>
      </div>

      {/* RTB-06: Operator Simulated RTB Active Notification Bar */}
      {isActiveUavRtbActive && (isActiveUavManual || simulatedNoticeUav === activeUavId) && (
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>SIMULATED RTB ACTIVE — {activeUavId}</span>
            <span className="text-[10px] text-amber-400/80 font-normal hidden sm:inline">
              (Decision Support Software Demo // In transit to Home Base)
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">
            DESTINATION: HOME BASE
          </span>
        </div>
      )}

      {/* 4. Dark Aerospace Tactical Radar Map Display */}
      <SectionCard
        title="OPERATIONAL AIRSPACE DISPLAY"
        subtitle={`SIMULATED OPERATING AREA: ${currentArea.name} // ${currentArea.environmentTag}`}
        headerClassName="px-3 py-1"
        contentClassName="p-1"
        action={
          <div className="flex items-center gap-2.5 text-[11px] font-mono text-slate-400 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              SIMULATED OPERATING AREA
            </span>
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>RADAR ACTIVE // 100 KM</span>
            </div>
          </div>
        }
      >
        <div
          onClick={() => setSelectedPopupUavId(null)}
          className="relative w-full aspect-[16/9] md:aspect-[2.2/1] lg:aspect-[2.5/1] min-h-[300px] max-h-[410px] rounded-xl bg-[#060a13] border border-slate-800/90 overflow-hidden shadow-2xl select-none"
        >
          {/* SVG Tactical Coordinate Grid & Radar Rings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              {/* Tactical Crosshair Grid Pattern */}
              <pattern id="tacticalGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e293b" strokeWidth="0.75" strokeOpacity="0.5" />
                <circle cx="30" cy="30" r="0.75" fill="#334155" />
              </pattern>
              {/* Dynamic Radial Gradient for Area Specific Climate Atmosphere */}
              <radialGradient id="radarGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor={currentArea.colorTint.glow1} stopOpacity="0.08" />
                <stop offset="60%" stopColor={currentArea.colorTint.glow2} stopOpacity="0.03" />
                <stop offset="100%" stopColor="#020617" stopOpacity="0.8" />
              </radialGradient>
            </defs>

            {/* Background Grid Pattern */}
            <rect width="100%" height="100%" fill="url(#tacticalGrid)" />
            <rect width="100%" height="100%" fill="url(#radarGlow)" />

            {/* Radar Concentric Range Rings (Home Base centered at 50% 50%) */}
            <circle cx="50%" cy="50%" r="14%" fill="none" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 3" />
            <circle cx="50%" cy="50%" r="26%" fill="none" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.2" />
            <circle cx="50%" cy="50%" r="38%" fill="none" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 4" />
            <circle cx="50%" cy="50%" r="50%" fill="none" stroke={currentArea.colorTint.ringColor} strokeWidth="1.2" strokeOpacity="0.3" />
            <circle cx="50%" cy="50%" r="62%" fill="none" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.15" strokeDasharray="5 5" />

            {/* Crosshair Cardinal Axes */}
            <line x1="0%" y1="50%" x2="100%" y2="50%" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="6 4" />
            <line x1="50%" y1="0%" x2="50%" y2="100%" stroke={currentArea.colorTint.ringColor} strokeWidth="1" strokeOpacity="0.3" strokeDasharray="6 4" />

            {/* Diagonal Azimuth Guide Lines */}
            <line x1="15%" y1="15%" x2="85%" y2="85%" stroke="#1e293b" strokeWidth="0.75" strokeOpacity="0.4" strokeDasharray="2 4" />
            <line x1="85%" y1="15%" x2="15%" y2="85%" stroke="#1e293b" strokeWidth="0.75" strokeOpacity="0.4" strokeDasharray="2 4" />

            {/* Range Ring Labels — SE quadrant, right of vertical axis, away from UAV patrol zones */}
            <text x="52%" y="37%" fill={currentArea.colorTint.accentColor} fontSize="8" fontFamily="monospace" opacity="0.35">25 KM</text>
            <text x="52%" y="25%" fill={currentArea.colorTint.accentColor} fontSize="8" fontFamily="monospace" opacity="0.35">50 KM</text>
            <text x="52%" y="13%" fill={currentArea.colorTint.accentColor} fontSize="8" fontFamily="monospace" opacity="0.35">75 KM</text>

            {/* Cardinal Direction Ticks — small, dim, hugging edges */}
            <text x="50%" y="3.5%" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">N</text>
            <text x="97%" y="51%" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="end">E</text>
            <text x="50%" y="98%" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">S</text>
            <text x="3%" y="51%" fill="#475569" fontSize="9" fontFamily="monospace" fontWeight="bold">W</text>

            {/*
              Sector boundary annotations — ultra-dim, pinned to the outermost
              corners of the map so they never collide with moving UAV markers.
              Font reduced to 8px, opacity 0.20 (decorative reference only).
            */}
            <text x="2%" y="8%"   fill="#334155" fontSize="8" fontFamily="monospace" letterSpacing="1" opacity="0.5">{currentArea.sectors.alpha}</text>
            <text x="76%" y="8%"  fill="#334155" fontSize="8" fontFamily="monospace" letterSpacing="1" opacity="0.5">{currentArea.sectors.bravo}</text>
            <text x="76%" y="96%" fill="#334155" fontSize="8" fontFamily="monospace" letterSpacing="1" opacity="0.5">{currentArea.sectors.charlie}</text>
            <text x="2%" y="96%" fill="#334155" fontSize="8" fontFamily="monospace" letterSpacing="1" opacity="0.5">{currentArea.sectors.delta}</text>

            {/* ── UAV Trail lines — rendered below markers in the same SVG layer ── */}
            {Object.entries(animSnapshot).map(([uavId, pos]) => {
              if (!pos.trail || pos.trail.length < 2) return null;
              const uav = uavList.find((u) => u.uav_id === uavId);
              const tTheme = getStatusTheme(getStatusCategory(uav));
              // Build trail segments: oldest → current position
              const pts = [...pos.trail, { x: pos.x, y: pos.y }];
              return pts.slice(1).map((pt, i) => {
                const prev = pts[i];
                const frac = (i + 1) / pts.length; // 0 (oldest) → 1 (newest)
                return (
                  <line
                    key={`${uavId}-t${i}`}
                    x1={`${prev.x}%`}
                    y1={`${prev.y}%`}
                    x2={`${pt.x}%`}
                    y2={`${pt.y}%`}
                    stroke={tTheme.color}
                    strokeWidth={frac * 1.8}
                    strokeOpacity={frac * 0.55}
                    strokeLinecap="round"
                  />
                );
              });
            })}

            {/* ── Emergency RTB Route Lines (RTB-03 & MAP UI-03) ── */}
            {rtbActiveUavs.map((rtb) => {
              if (rtb.isArrived) return null;
              return (
                <g key={`rtb-route-${rtb.uavId}`}>
                  {/* Outer subtle glow corridor */}
                  <line
                    ref={(el) => {
                      if (el) rtbGlowDomRefs.current[rtb.uavId] = el;
                    }}
                    x1={`${rtb.visualPos.x}%`}
                    y1={`${rtb.visualPos.y}%`}
                    x2={`${HOME_BASE_CENTER.x}%`}
                    y2={`${HOME_BASE_CENTER.y}%`}
                    stroke="#f43f5e"
                    strokeWidth={rtb.isSelected ? '3.5' : '2'}
                    strokeOpacity={rtb.isSelected ? '0.35' : '0.18'}
                    strokeLinecap="round"
                  />
                  {/* High-visibility dashed tactical route vector */}
                  <line
                    ref={(el) => {
                      if (el) rtbVectorDomRefs.current[rtb.uavId] = el;
                    }}
                    x1={`${rtb.visualPos.x}%`}
                    y1={`${rtb.visualPos.y}%`}
                    x2={`${HOME_BASE_CENTER.x}%`}
                    y2={`${HOME_BASE_CENTER.y}%`}
                    stroke={rtb.isSelected ? '#fb7185' : '#f43f5e'}
                    strokeWidth={rtb.isSelected ? '2' : '1.5'}
                    strokeDasharray={rtb.isSelected ? '6 3' : '5 4'}
                    strokeOpacity={rtb.isSelected ? '0.95' : '0.8'}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Corner Coordinate HUD Stencils: SIMULATED OPERATING AREA METADATA (Top-Left) */}
          <div className="absolute top-2 left-2 pointer-events-none text-[9px] font-mono text-slate-300 space-y-0.5 bg-[#060a13]/90 p-1.5 rounded border border-slate-800/80 backdrop-blur-sm shadow-md z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">AREA:</span>
              <span className="font-bold" style={{ color: currentArea.colorTint.accentColor }}>{currentArea.name}</span>
            </div>
            <div className="text-slate-400">ENV: <span className="text-slate-200 font-semibold">{currentArea.environmentTag}</span></div>
            <div className="text-slate-400">THEATER: <span className="text-slate-300">{currentArea.theater}</span></div>
            <div className="text-slate-400">DATUM: <span className="text-slate-300">{currentArea.datum}</span></div>
          </div>

          {/* Environmental Telemetry HUD (Top-Right) */}
          <div className="absolute top-2 right-2 pointer-events-none text-right text-[9px] font-mono text-slate-300 space-y-0.5 bg-[#060a13]/90 p-1.5 rounded border border-slate-800/80 backdrop-blur-sm shadow-md z-10">
            <div className="text-slate-400">RADAR: <span className="text-emerald-400 font-bold">TACTICAL SURVEILLANCE</span></div>
            <div className="text-slate-400">STATUS: <span className="text-sky-300 font-semibold">SIMULATED TELEMETRY</span></div>
            <div className="text-slate-400">CLIMATE: <span className="text-slate-200 font-semibold">{currentArea.environmentalProfile.climate}</span></div>
            <div className="text-slate-400">COND: <span className="text-slate-200">{currentArea.environmentalProfile.ambientTemp} · {currentArea.environmentalProfile.humidity}</span></div>
            <div className="text-slate-400">ELEV: <span className="text-slate-300">{currentArea.environmentalProfile.pressureAlt}</span></div>
          </div>

          {/* Map Legend (Bottom-Left) */}
          <div className="absolute bottom-2 left-2 bg-[#0a0f1d]/90 border border-slate-800/90 rounded-lg p-2 backdrop-blur-sm shadow-lg text-[9px] font-mono space-y-1 z-20">
            <div className="text-slate-400 font-bold border-b border-slate-800 pb-0.5 flex items-center justify-between gap-3">
              <span>STATUS LEGEND</span>
              <span className="text-[8px] text-slate-500">ICAO/AERO</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-slate-300">HEALTHY (&ge; 80% &amp; LOW RISK)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-slate-300">WARNING (60-80% OR MED)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <span className="text-slate-300">FAULT / HIGH RISK (&lt; 60% OR CRIT)</span>
            </div>
            {rtbActiveUavs.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-rose-500/30">
                <span className="w-3 h-0.5 bg-rose-500 border-b border-dashed border-rose-300 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  EMERGENCY RTB ROUTE ({rtbActiveUavs.length} ACTIVE)
                </span>
              </div>
            )}
            {uavList.some((u) => isUavRtbCompleted(u.uav_id) || animSnapshot[u.uav_id]?.rtbCompleted) && (
              <div className="flex items-center gap-1.5 pt-0.5 border-t border-emerald-500/30">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className="text-emerald-400 font-semibold">
                  RTB COMPLETE (AT HOME BASE)
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-800/60">
              <span className="w-2 h-2 rotate-45 border" style={{ borderColor: currentArea.colorTint.accentColor, backgroundColor: `${currentArea.colorTint.accentColor}30` }} />
              <span style={{ color: currentArea.colorTint.accentColor }}>{currentArea.homeBaseName}</span>
            </div>
          </div>

          {/* HOME BASE MARKER (Center, Dynamic Base Callout) — z-25 keeps base clear and prominent */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-25 group pointer-events-none"
            style={{ left: `${HOME_BASE_CENTER.x}%`, top: `${HOME_BASE_CENTER.y}%` }}
          >
            {/* Diamond Airbase Anchor */}
            <div className="relative flex flex-col items-center">
              <div
                className="w-8 h-8 rotate-45 rounded bg-slate-950/95 border-2 shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 pointer-events-auto"
                style={{ borderColor: currentArea.colorTint.accentColor, boxShadow: `0 0 15px ${currentArea.colorTint.accentColor}50` }}
              >
                <Home className="w-4 h-4 -rotate-45" style={{ color: currentArea.colorTint.accentColor }} />
              </div>
              <div className="mt-2 text-center whitespace-nowrap bg-[#0b1120]/95 px-2 py-0.5 rounded border border-slate-700/80 text-[9px] font-mono font-bold text-slate-200 shadow-md">
                {currentArea.homeBaseName}
              </div>
              <div className="text-[8px] font-mono text-slate-400">
                {currentArea.homeBaseCoords}
              </div>
            </div>
          </div>

          {/* EMERGENCY RTB ROUTE LABELS (RTB-03 & MAP UI-03) — Staggered along vectors, suppressed when arrived */}
          {rtbActiveUavs.map((rtb) => {
            if (rtb.isArrived) return null;
            return (
              <div
                key={`rtb-label-${rtb.uavId}`}
                ref={(el) => {
                  if (el) rtbLabelDomRefs.current[rtb.uavId] = el;
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
                style={{ left: `${rtb.labelPos.x}%`, top: `${rtb.labelPos.y}%` }}
              >
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-lg ${
                    rtb.isSelected
                      ? 'bg-slate-950/95 text-rose-300 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-1 ring-rose-500/50'
                      : 'bg-slate-950/90 text-rose-400 border border-rose-600/70 shadow-[0_0_6px_rgba(244,63,94,0.25)]'
                  }`}
                  style={{ backdropFilter: 'blur(4px)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>RTB · {rtb.uavId}</span>
                </div>
              </div>
            );
          })}

          {/* EXACTLY 5 UAV TACTICAL MARKERS — Visual deconfliction and directional callsign pills */}
          {uavList.map((uav) => {
            const uavId = uav.uav_id;
            // Use live animated position; fall back to static definition during first frame
            const animPos = animSnapshot[uavId];
            const staticFallback = UAV_TACTICAL_POSITIONS[uavId] || { x: 50, y: 50, heading: 0 };
            const pos = animPos
              ? { x: animPos.x, y: animPos.y, heading: animPos.heading }
              : staticFallback;
            const visualPos = {
              x: animPos?.visualX ?? pos.x,
              y: animPos?.visualY ?? pos.y,
              heading: pos.heading,
            };
            const statusCat = getStatusCategory(uav);
            const theme = getStatusTheme(statusCat);
            const isSelected = uavId === activeUavId;
            const isPopupOpen = selectedPopupUavId === uavId;
            const isCompleted = isUavRtbCompleted(uavId) || Boolean(animPos?.rtbCompleted);
            const healthNum = uav.engine_health !== undefined ? Number(uav.engine_health) : null;
            const healthText = healthNum !== null ? `${healthNum.toFixed(1)}%` : '--';

            // Calculate non-overlapping directional slot for callsign pill
            const labelSlot = getLabelSlot(uavId, visualPos, animSnapshot);
            const labelSlotClass =
              labelSlot === 'top'
                ? 'bottom-[calc(100%+5px)] left-1/2 -translate-x-1/2'
                : labelSlot === 'left'
                  ? 'right-[calc(100%+6px)] top-1/2 -translate-y-1/2'
                  : labelSlot === 'right'
                    ? 'left-[calc(100%+6px)] top-1/2 -translate-y-1/2'
                    : 'top-[calc(100%+5px)] left-1/2 -translate-x-1/2';

            return (
              <div
                key={uavId}
                ref={(el) => {
                  if (el) markerDomRefs.current[uavId] = el;
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                  isPopupOpen ? 'z-50' : 'z-20'
                }`}
                style={{ left: `${visualPos.x}%`, top: `${visualPos.y}%` }}
              >
                {/* Tactical Marker Container */}
                <div className="relative flex flex-col items-center">
                  {/* Selected / Active Pulsing Tactical Ring */}
                  {isSelected && (
                    <div
                      className="absolute -inset-2 rounded-full border-2 animate-ping pointer-events-none opacity-20"
                      style={{ borderColor: isCompleted ? '#10b981' : theme.color }}
                    />
                  )}

                  {/* Marker Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkerClick(uavId);
                    }}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none shadow-lg cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950 scale-110'
                        : 'hover:scale-105'
                    } ${isCompleted ? 'bg-emerald-500/20 border-emerald-500/60' : `${theme.bgClass} ${theme.borderClass}`} border-2`}
                    style={{
                      boxShadow: `0 0 12px ${isCompleted ? '#10b98140' : `${theme.color}40`}`,
                    }}
                    aria-label={`Select ${uavId} tactical marker`}
                  >
                    {/* Rotated Drone / Airplane Icon */}
                    <div
                      ref={(el) => {
                        if (el) iconDomRefs.current[uavId] = el;
                      }}
                      style={{ transform: `rotate(${visualPos.heading}deg)` }}
                    >
                      <Plane className={`w-3.5 h-3.5 ${isCompleted ? 'text-emerald-400' : theme.textClass}`} />
                    </div>

                    {/* Small Status Indicator Dot */}
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-950 ${isCompleted ? 'bg-emerald-400' : theme.dotClass}`}
                    />
                  </button>

                  {/* Marker Callsign Label Pill — Directionally slotted to prevent overlap */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkerClick(uavId);
                    }}
                    className={`absolute ${labelSlotClass} px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap cursor-pointer transition-all border shadow-md flex items-center gap-1 z-20 ${
                      isCompleted
                        ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : isSelected
                          ? 'bg-[#0b1221] text-sky-300 border-sky-500/80 shadow-[0_0_10px_rgba(14,165,233,0.4)]'
                          : 'bg-[#060a13]/95 text-slate-200 border-slate-700/80 hover:border-slate-500'
                    }`}
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <span>{uavId}</span>
                    {isCompleted ? (
                      <span className="text-[8px] font-bold text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5 inline" />
                        <span>RTB COMPLETE</span>
                      </span>
                    ) : (
                      <span className={`text-[8px] font-semibold ${theme.textClass}`}>
                        {healthText}
                      </span>
                    )}
                  </div>

                  {/* RTB-05: Dedicated compact status callout at Home Base for completed UAV */}
                  {isCompleted && (
                    <div className="absolute top-[calc(100%+24px)] left-1/2 -translate-x-1/2 pointer-events-none z-30">
                      <div className="px-1.5 py-0.5 rounded text-[7.5px] font-mono font-bold bg-emerald-950/95 text-emerald-300 border border-emerald-500/80 shadow-lg whitespace-nowrap flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>RTB COMPLETE · {uavId} · ARRIVED AT HOME BASE</span>
                      </div>
                    </div>
                  )}

                  {/* COMPACT SIDE-ANCHORED INFORMATION POPUP (MAP UI-03) */}
                  {isPopupOpen && (() => {
                    const openLeft = visualPos.x > 55;
                    const popupStyle = {
                      position: 'absolute',
                      width: '210px',
                      zIndex: 60,
                    };

                    if (openLeft) {
                      popupStyle.right = 'calc(100% + 10px)';
                    } else {
                      popupStyle.left = 'calc(100% + 10px)';
                    }

                    if (visualPos.y < 22) {
                      popupStyle.top = '0';
                    } else if (visualPos.y > 78) {
                      popupStyle.bottom = '0';
                    } else {
                      popupStyle.top = '50%';
                      popupStyle.transform = 'translateY(-50%)';
                    }

                    return (
                      <div
                        style={popupStyle}
                        className="p-2 rounded-lg bg-[#0a0f1d]/98 border border-slate-700/90 shadow-2xl backdrop-blur-md space-y-1.5 text-slate-100 font-mono text-[10px] select-text"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                          <div className="flex items-center gap-1.5">
                            <Plane className="w-3 h-3 text-sky-400" />
                            <span className="text-[11px] font-bold text-slate-100">{uavId}</span>
                            {isSelected && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPopupUavId(null);
                            }}
                            className="p-0.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none cursor-pointer"
                            aria-label="Close popup"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Status Classification */}
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-slate-400 font-medium">STATUS:</span>
                          {isCompleted ? (
                            <span className="px-1.5 py-0.5 rounded font-bold border text-[8px] bg-emerald-500/20 text-emerald-300 border-emerald-500/50 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              RTB COMPLETE
                            </span>
                          ) : isSimulatedRtbActive(uavId) ? (
                            <span className="px-1.5 py-0.5 rounded font-bold border text-[8px] bg-amber-500/20 text-amber-300 border-amber-500/50 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              SIMULATED RTB
                            </span>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded font-bold border text-[8px] ${theme.badgeBg}`}>
                              {theme.label}
                            </span>
                          )}
                        </div>

                        {isCompleted && (
                          <div className="p-1 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-[8.5px] font-bold flex items-center justify-between">
                            <span>RECOVERY:</span>
                            <span className="text-white">ARRIVED AT HOME BASE</span>
                          </div>
                        )}

                        {/* 5 Required Live AI & Telemetry Results in 2-col compact grid */}
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          <div className="p-1 rounded bg-slate-900/90 border border-slate-800/80">
                            <span className="text-[8px] text-slate-400 block">HEALTH</span>
                            <span className={`font-bold block ${theme.textClass}`}>{healthText}</span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/90 border border-slate-800/80">
                            <span className="text-[8px] text-slate-400 block">MISSION RISK</span>
                            <span className={`font-bold block ${
                              (uav.mission_risk || '').toUpperCase() === 'HIGH' || (uav.mission_risk || '').toUpperCase() === 'CRITICAL'
                                ? 'text-rose-400'
                                : (uav.mission_risk || '').toUpperCase() === 'MEDIUM'
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                            }`}>
                              {uav.mission_risk || 'LOW'}
                            </span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/90 border border-slate-800/80 col-span-2">
                            <span className="text-[8px] text-slate-400 block">FAULT</span>
                            <span className="font-bold text-slate-200 block truncate">
                              {(uav.predicted_fault || 'NORMAL').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/90 border border-slate-800/80">
                            <span className="text-[8px] text-slate-400 block">RUL</span>
                            <span className="font-bold text-sky-300 block">
                              {(uav.predicted_rul ?? uav.predicted_rul_hours) !== undefined
                                ? `${Math.round(Number(uav.predicted_rul ?? uav.predicted_rul_hours))} hrs`
                                : '--'}
                            </span>
                          </div>
                          <div className="p-1 rounded bg-slate-900/90 border border-slate-800/80">
                            <span className="text-[8px] text-slate-400 block">PHASE</span>
                            <span className="font-bold text-slate-200 block truncate">
                              {isCompleted ? 'ARRIVED AT BASE' : (uav.flight_phase || uav.engine_telemetry?.flight_phase || 'CRUISE')}
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-0.5 border-t border-slate-800/80 flex items-center justify-between text-[8px] text-slate-400">
                          <span className="truncate">{currentArea.shortName}</span>
                          <span className="text-emerald-400 font-semibold">{isCompleted ? 'AT BASE' : 'LIVE'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 5. Fleet Telemetry Quick-Jump Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {uavList.map((uav) => {
          const uavId = uav.uav_id;
          const statusCat = getStatusCategory(uav);
          const theme = getStatusTheme(statusCat);
          const isSelected = uavId === activeUavId;
          const isCompletedUav = Boolean(isUavRtbCompleted(uavId) || animSnapshot[uavId]?.rtbCompleted);
          const healthNum = uav.engine_health !== undefined ? Number(uav.engine_health) : null;
          const healthVal = healthNum !== null ? `${healthNum.toFixed(1)}%` : '--';

          return (
            <button
              key={uavId}
              type="button"
              onClick={() => handleMarkerClick(uavId)}
              className={`p-2 rounded-lg text-left transition-all duration-200 border flex flex-col justify-between font-mono cursor-pointer ${
                isSelected
                  ? 'bg-[#10182b] border-sky-500/80 shadow-[0_0_12px_rgba(14,165,233,0.25)] ring-1 ring-sky-500'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-slate-200">{uavId}</span>
                <span className={`w-2 h-2 rounded-full ${isCompletedUav ? 'bg-emerald-400' : theme.dotClass}`} />
              </div>
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Health:</span>
                  <span className={`font-bold ${theme.textClass}`}>{healthVal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk:</span>
                  <span className="font-semibold text-slate-300">{uav.mission_risk || 'LOW'}</span>
                </div>
                {isCompletedUav ? (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Status:</span>
                    <span className="truncate">RTB COMPLETE</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Phase:</span>
                    <span className="text-slate-400 truncate">{uav.flight_phase || uav.engine_telemetry?.flight_phase || 'CRUISE'}</span>
                  </div>
                )}
              </div>
              <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
                <span>{currentArea.shortName}</span>
                <span className={isSelected ? 'text-sky-400 font-bold' : ''}>
                  {isSelected ? 'SELECTED' : 'SELECT'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 6. RTB-06: Confirmation Modal for Simulated RTB Command */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-[#0a0f1d] border border-amber-500/60 p-4 shadow-2xl space-y-3 font-mono text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span id="confirm-modal-title" className="text-xs font-bold tracking-wider uppercase">
                  SIMULATED RTB COMMAND
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-100">
                Start simulated RTB for {activeUavId}?
              </p>
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10.5px] text-amber-300/90 leading-relaxed space-y-1">
                <div className="font-bold text-amber-200">
                  ⚠️ SIMULATED DEMONSTRATION ONLY
                </div>
                <div>
                  This is only software demonstration and decision support. It does NOT represent or transmit real UAV flight-control commands.
                </div>
              </div>
              <div className="text-[10px] text-slate-400">
                Target: <strong className="text-slate-200">{activeUavId}</strong> · Destination: <strong className="text-sky-300">HOME BASE ({currentArea.homeBaseName})</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                id="cancel-simulated-rtb-btn"
                onClick={() => setShowConfirmModal(false)}
                className="px-3 py-1.5 rounded text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                id="confirm-simulated-rtb-btn"
                onClick={handleConfirmSimulatedRtb}
                className="px-3.5 py-1.5 rounded text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 border border-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.4)]"
              >
                <span className="text-xs">↩</span>
                <span>CONFIRM SIMULATED RTB</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
