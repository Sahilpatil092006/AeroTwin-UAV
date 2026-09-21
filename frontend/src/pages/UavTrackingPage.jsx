import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { useFleet } from '../hooks/useFleet';
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

  // ── Simulated UAV movement animation ──────────────────────────────────────
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
        trailCounter: 0,
      };
    }
    animStateRef.current = s;
  }

  // animSnapshot is the React-state snapshot used for rendering.
  const [animSnapshot, setAnimSnapshot] = useState(() => {
    const snap = {};
    for (const [uavId, route] of Object.entries(UAV_PATROL_ROUTES)) {
      const wp = route.waypoints[route.startIdx];
      snap[uavId] = { x: wp.x, y: wp.y, heading: route.initialHeading, trail: [] };
    }
    return snap;
  });

  useEffect(() => {
    let frameId;

    const tick = () => {
      const state = animStateRef.current;
      const nextSnap = {};

      for (const [uavId, route] of Object.entries(UAV_PATROL_ROUTES)) {
        const uavState = state[uavId];
        const target = route.waypoints[uavState.waypointIdx];

        const dx = target.x - uavState.x;
        const dy = target.y - uavState.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < WP_ARRIVAL_DIST) {
          // Advance to the next waypoint in the circuit
          uavState.waypointIdx = (uavState.waypointIdx + 1) % route.waypoints.length;
        } else {
          // Move toward the current target waypoint
          const nx = dx / dist;
          const ny = dy / dist;
          uavState.x += nx * route.speed;
          uavState.y += ny * route.speed;

          // Smooth heading: target = angle from screen-up (0° = north on map)
          // atan2(dx, -dy) gives clockwise angle from the upward screen axis
          const targetHeading = (Math.atan2(dx, -dy) * 180) / Math.PI;
          const angleDiff = ((targetHeading - uavState.heading + 540) % 360) - 180;
          uavState.heading += angleDiff * 0.06; // interpolation factor

          // Sample trail at TRAIL_SAMPLE_EVERY interval
          uavState.trailCounter++;
          if (uavState.trailCounter >= TRAIL_SAMPLE_EVERY) {
            uavState.trailCounter = 0;
            uavState.trail = [
              ...uavState.trail.slice(-(TRAIL_MAX_POINTS - 1)),
              { x: uavState.x, y: uavState.y },
            ];
          }
        }

        nextSnap[uavId] = {
          x: uavState.x,
          y: uavState.y,
          heading: uavState.heading,
          trail: uavState.trail,
        };
      }

      setAnimSnapshot(nextSnap);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
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

  // Handler to select UAV and open popup
  const handleMarkerClick = (uavId) => {
    setActiveUavId(uavId);
    setSelectedPopupUavId(uavId);
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header with required titles & badges */}
      <PageHeader
        systemTag="AEROTWIN // TACTICAL AIRSPACE"
        title="UAV Tracking"
        description="Airspace tactical situational awareness display presenting simulated operational positions, mission risks, and live engine status for all deployed fleet assets across selectable simulated operating areas."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              UAV LIVE TRACKING
            </span>
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800/90 text-slate-300 border border-slate-700 shadow-sm">
              SIMULATED TELEMETRY
            </span>
          </div>
        }
      />

      {/* 2. SIMULATED OPERATING AREA SELECTOR (STEP 19B.2) */}
      <div className="p-3.5 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-200 tracking-wider">
                  SIMULATED OPERATING AREA
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  SIMULATION SCENARIO ONLY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-sky-300 bg-sky-500/10 border border-sky-500/30">
                  {currentArea.environmentTag}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {currentArea.description}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">TELEMETRY MODE:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 font-semibold">
              SIMULATED TELEMETRY
            </span>
          </div>
        </div>

        {/* 3 Area Selector Segmented Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-0.5">
          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
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
                  className={`p-2.5 rounded-lg text-left font-mono transition-all border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${area.colorTint.buttonActiveClass} ring-1 ring-offset-1 ring-offset-slate-950`
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold truncate">{area.name}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? 'animate-pulse' : ''}`}
                      style={{ backgroundColor: area.colorTint.accentColor }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {area.environmentalProfile.atmosphericCondition}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Persistent Active UAV Context Banner */}
      <div className="p-3 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                SHOWING DATA FOR:
              </span>
              <span className="text-base font-bold font-mono text-sky-400 tracking-wide">
                {activeUavId}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-semibold">
                PHASE: {activeUav?.flight_phase || activeUav?.engine_telemetry?.flight_phase || 'CRUISE'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${activeUavTheme.badgeBg}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${activeUavTheme.dotClass}`} />
                {activeUavTheme.label}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                · AREA: <strong className="text-slate-200 font-bold">{currentArea.shortName}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick UAV Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80">
          <label htmlFor="tracking-uav-select" className="text-xs font-mono text-slate-400 whitespace-nowrap">
            ACTIVE UAV:
          </label>
          <select
            id="tracking-uav-select"
            value={activeUavId}
            onChange={(e) => handleMarkerClick(e.target.value)}
            className="bg-transparent text-slate-100 font-mono text-xs font-bold focus:outline-none cursor-pointer"
            aria-label="Select Active UAV"
          >
            {uavList.map((uav) => (
              <option key={uav.uav_id} value={uav.uav_id} className="bg-slate-900 text-slate-100">
                {uav.uav_id} ({getStatusCategory(uav)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Dark Aerospace Tactical Radar Map Display */}
      <SectionCard
        title="OPERATIONAL AIRSPACE DISPLAY"
        subtitle={`SIMULATED OPERATING AREA: ${currentArea.name} // ${currentArea.environmentTag}`}
        action={
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              SIMULATED OPERATING AREA
            </span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>RADAR ACTIVE // RANGE: 100 KM</span>
            </div>
          </div>
        }
      >
        <div className="relative w-full aspect-[16/10] min-h-[480px] rounded-xl bg-[#060a13] border border-slate-800/90 overflow-hidden shadow-2xl select-none">
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
          </svg>

          {/* Corner Coordinate HUD Stencils: SIMULATED OPERATING AREA METADATA (Top-Left) */}
          <div className="absolute top-3 left-3 pointer-events-none text-[10px] font-mono text-slate-300 space-y-0.5 bg-[#060a13]/85 p-2 rounded border border-slate-800/80 backdrop-blur-sm shadow-md z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">SIMULATED OPERATING AREA:</span>
              <span className="font-bold" style={{ color: currentArea.colorTint.accentColor }}>{currentArea.name}</span>
            </div>
            <div className="text-slate-400">ENVIRONMENT: <span className="text-slate-200 font-semibold">{currentArea.environmentTag}</span></div>
            <div className="text-slate-400">THEATER: <span className="text-slate-300">{currentArea.theater}</span></div>
            <div className="text-slate-400">DATUM: <span className="text-slate-300">{currentArea.datum}</span></div>
          </div>

          {/* Environmental Telemetry HUD (Top-Right) */}
          <div className="absolute top-3 right-3 pointer-events-none text-right text-[10px] font-mono text-slate-300 space-y-0.5 bg-[#060a13]/85 p-2 rounded border border-slate-800/80 backdrop-blur-sm shadow-md z-10">
            <div className="text-slate-400">RADAR: <span className="text-emerald-400 font-bold">TACTICAL SURVEILLANCE</span></div>
            <div className="text-slate-400">STATUS: <span className="text-sky-300 font-semibold">SIMULATED TELEMETRY</span></div>
            <div className="text-slate-400">CLIMATE: <span className="text-slate-200 font-semibold">{currentArea.environmentalProfile.climate}</span></div>
            <div className="text-slate-400">CONDITIONS: <span className="text-slate-200">{currentArea.environmentalProfile.ambientTemp} · {currentArea.environmentalProfile.humidity}</span></div>
            <div className="text-slate-400">ELEVATION: <span className="text-slate-300">{currentArea.environmentalProfile.pressureAlt}</span></div>
          </div>

          {/* Map Legend (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 bg-[#0a0f1d]/90 border border-slate-800/90 rounded-lg p-2.5 backdrop-blur-sm shadow-lg text-[10px] font-mono space-y-1.5 z-20">
            <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
              <span>STATUS LEGEND</span>
              <span className="text-[9px] text-slate-500">ICAO/AERO</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-slate-300">HEALTHY (HEALTH &ge; 80% &amp; LOW RISK)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-slate-300">WARNING / MEDIUM RISK (HEALTH 60-80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <span className="text-slate-300">FAULT / HIGH RISK (HEALTH &lt; 60% OR CRIT)</span>
            </div>
            <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800/60">
              <span className="w-2.5 h-2.5 rotate-45 border" style={{ borderColor: currentArea.colorTint.accentColor, backgroundColor: `${currentArea.colorTint.accentColor}30` }} />
              <span style={{ color: currentArea.colorTint.accentColor }}>{currentArea.homeBaseName}</span>
            </div>
          </div>

          {/* HOME BASE MARKER (Center, Dynamic Base Callout) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
            style={{ left: `${HOME_BASE_CENTER.x}%`, top: `${HOME_BASE_CENTER.y}%` }}
          >
            {/* Diamond Airbase Anchor */}
            <div className="relative flex flex-col items-center">
              <div
                className="w-8 h-8 rotate-45 rounded bg-slate-950/95 border-2 shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
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

          {/* EXACTLY 5 UAV TACTICAL MARKERS */}
          {uavList.map((uav) => {
            const uavId = uav.uav_id;
            // Use live animated position; fall back to static definition during first frame
            const animPos = animSnapshot[uavId];
            const staticFallback = UAV_TACTICAL_POSITIONS[uavId] || { x: 50, y: 50, heading: 0 };
            const pos = animPos
              ? { x: animPos.x, y: animPos.y, heading: animPos.heading }
              : staticFallback;
            const statusCat = getStatusCategory(uav);
            const theme = getStatusTheme(statusCat);
            const isSelected = uavId === activeUavId;
            const isPopupOpen = selectedPopupUavId === uavId;
            const healthNum = uav.engine_health !== undefined ? Number(uav.engine_health) : null;
            const healthText = healthNum !== null ? `${healthNum.toFixed(1)}%` : '--';

            return (
              <div
                key={uavId}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                  isPopupOpen ? 'z-30' : 'z-20'
                }`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                {/* Tactical Marker Container */}
                <div className="relative flex flex-col items-center">
                  {/* Selected / Active Pulsing Tactical Ring — opacity reduced so label pill stays readable */}
                  {isSelected && (
                    <div
                      className="absolute -inset-2.5 rounded-full border-2 animate-ping pointer-events-none opacity-20"
                      style={{ borderColor: theme.color }}
                    />
                  )}

                  {/* Marker Button */}
                  <button
                    type="button"
                    onClick={() => handleMarkerClick(uavId)}
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none shadow-lg cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950 scale-110'
                        : 'hover:scale-105'
                    } ${theme.bgClass} border-2 ${theme.borderClass}`}
                    style={{
                      boxShadow: `0 0 14px ${theme.color}40`,
                    }}
                    aria-label={`Select ${uavId} tactical marker`}
                  >
                    {/* Rotated Drone / Airplane Icon */}
                    <div
                      style={{ transform: `rotate(${pos.heading}deg)` }}
                      className="transition-transform duration-300"
                    >
                      <Plane className={`w-4 h-4 ${theme.textClass}`} />
                    </div>

                    {/* Small Status Indicator Dot */}
                    <span
                      className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${theme.dotClass}`}
                    />
                  </button>

                  {/* Marker Callsign Label Pill — strong dark bg ensures readability over rings/trails */}
                  <div
                    onClick={() => handleMarkerClick(uavId)}
                    className={`mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap cursor-pointer transition-all border shadow-md flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#0b1221] text-sky-300 border-sky-500/80 shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                        : 'bg-[#060a13]/95 text-slate-200 border-slate-700/80 hover:border-slate-500'
                    }`}
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <span>{uavId}</span>
                    <span className={`text-[9px] font-semibold ${theme.textClass}`}>
                      {healthText}
                    </span>
                  </div>

                  {/* SMALL POPUP ON CLICK (Requirement 6) — boundary-aware positioning */}
                  {isPopupOpen && (() => {
                    // ── Popup sizing constants (percentage of map) ──────────
                    // Popup is ~256px wide; map is variable. Use % thresholds:
                    //   POPUP_W_PCT  ≈ width of popup as % of map width
                    //   POPUP_H_PCT  ≈ approx height of popup as % of map height
                    // These drive open-direction decisions, not exact pixel math.
                    const POPUP_W_PCT = 27;   // ~256 px on a ~960 px map ≈ 27%
                    const POPUP_H_PCT = 44;   // ~260 px on a ~600 px map ≈ 44%
                    const MARKER_H_PCT = 9;   // vertical space the marker+label takes

                    // ── Legend avoidance zone (bottom-left) ──────────────────
                    // Legend sits at bottom-left; avoid placing popup there.
                    const LEGEND_X_MAX = 30;  // legend ends at ~30% from left
                    const LEGEND_Y_MIN = 58;  // legend starts at ~58% from top

                    // ── Horizontal direction ──────────────────────────────────
                    // Prefer opening to the right; flip left when near right edge.
                    const openRight = pos.x + POPUP_W_PCT <= 97;
                    const openLeft  = !openRight;

                    // ── Vertical direction ───────────────────────────────────
                    // Default: popup opens BELOW the marker (top-14).
                    // Open UPWARD when near the bottom OR when opening right+left
                    // into the legend zone.
                    const nearBottom = pos.y + MARKER_H_PCT + POPUP_H_PCT > 96;
                    const wouldHitLegend =
                      openLeft &&
                      pos.x - POPUP_W_PCT < LEGEND_X_MAX &&
                      pos.y + MARKER_H_PCT > LEGEND_Y_MIN;
                    const openUp = nearBottom || wouldHitLegend;

                    // ── Compute absolute style ────────────────────────────────
                    const popupStyle = {
                      position: 'absolute',
                      width: '256px',
                      maxHeight: '320px',
                      overflowY: 'auto',
                    };

                    // Horizontal anchor
                    if (openRight) {
                      popupStyle.left = '50%';   // left edge aligns with marker centre
                    } else {
                      popupStyle.right = '50%';  // right edge aligns with marker centre
                    }

                    // Vertical anchor
                    if (openUp) {
                      // position above the marker button (marker button ~36px + label ~24px ≈ 60px)
                      popupStyle.bottom = '110%';
                    } else {
                      popupStyle.top = '110%';
                    }

                    return (
                    <div
                      style={popupStyle}
                      className="z-40 p-3 rounded-lg bg-[#0b101d]/98 border border-slate-700/90 shadow-2xl backdrop-blur-md space-y-2 text-slate-100 font-mono"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Popup Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <div className="flex items-center gap-2">
                          <Plane className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-xs font-bold tracking-wide text-slate-100">
                            {uavId}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
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
                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none"
                          aria-label="Close popup"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Status Tag */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">STATUS CLASSIFICATION:</span>
                        <span className={`px-2 py-0.5 rounded font-bold border text-[9px] ${theme.badgeBg}`}>
                          {theme.label}
                        </span>
                      </div>

                      {/* 5 Required Live AI & Telemetry Results */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        {/* 1. Engine Health */}
                        <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80">
                          <span className="text-[9px] text-slate-400 block">ENGINE HEALTH</span>
                          <span className={`font-bold block ${theme.textClass}`}>
                            {healthText}
                          </span>
                        </div>

                        {/* 2. Mission Risk */}
                        <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80">
                          <span className="text-[9px] text-slate-400 block">MISSION RISK</span>
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

                        {/* 3. Predicted Fault */}
                        <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80 col-span-2">
                          <span className="text-[9px] text-slate-400 block">PREDICTED FAULT</span>
                          <span className="font-bold text-slate-200 block truncate">
                            {(uav.predicted_fault || 'NORMAL').replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* 4. RUL */}
                        <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80">
                          <span className="text-[9px] text-slate-400 block">PREDICTED RUL</span>
                          <span className="font-bold text-sky-300 block">
                            {(uav.predicted_rul ?? uav.predicted_rul_hours) !== undefined
                              ? `${Math.round(Number(uav.predicted_rul ?? uav.predicted_rul_hours))} hrs`
                              : '--'}
                          </span>
                        </div>

                        {/* 5. Flight Phase */}
                        <div className="p-1.5 rounded bg-slate-900/90 border border-slate-800/80">
                          <span className="text-[9px] text-slate-400 block">FLIGHT PHASE</span>
                          <span className="font-bold text-slate-200 block truncate">
                            {uav.flight_phase || uav.engine_telemetry?.flight_phase || 'CRUISE'}
                          </span>
                        </div>
                      </div>

                      {/* Popup Footer Note */}
                      <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
                        <span>OPERATING THEATER: {currentArea.shortName}</span>
                        <span className="text-emerald-400 font-semibold">LIVE CONNECTED</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {uavList.map((uav) => {
          const uavId = uav.uav_id;
          const statusCat = getStatusCategory(uav);
          const theme = getStatusTheme(statusCat);
          const isSelected = uavId === activeUavId;
          const healthNum = uav.engine_health !== undefined ? Number(uav.engine_health) : null;
          const healthVal = healthNum !== null ? `${healthNum.toFixed(1)}%` : '--';

          return (
            <button
              key={uavId}
              type="button"
              onClick={() => handleMarkerClick(uavId)}
              className={`p-3 rounded-lg text-left transition-all duration-200 border flex flex-col justify-between font-mono cursor-pointer ${
                isSelected
                  ? 'bg-[#10182b] border-sky-500/80 shadow-[0_0_12px_rgba(14,165,233,0.25)] ring-1 ring-sky-500'
                  : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-xs font-bold text-slate-200">{uavId}</span>
                <span className={`w-2 h-2 rounded-full ${theme.dotClass}`} />
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
                <div className="flex justify-between">
                  <span>Phase:</span>
                  <span className="text-slate-400 truncate">{uav.flight_phase || uav.engine_telemetry?.flight_phase || 'CRUISE'}</span>
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
                <span>{currentArea.shortName}</span>
                <span className={isSelected ? 'text-sky-400 font-bold' : ''}>
                  {isSelected ? 'SELECTED' : 'SELECT'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
