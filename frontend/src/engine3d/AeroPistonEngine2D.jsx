import React, { useState } from 'react';
import { ENGINE_PARTS, getComponentStatus } from './enginePartsData';
import { Crosshair, Info, Layers, Eye, Box, FileCode2 } from 'lucide-react';

export default function AeroPistonEngine2D({
  selectedPartId,
  onSelectPart,
  selectedCylinder = 'CYLINDER 1',
  onSelectCylinder = () => {},
  onSwitchMode = () => {},
  telemetry = {},
  digitalTwin = {},
  isConnected = false,
  height = 540,
}) {
  const [hoveredPartId, setHoveredPartId] = useState(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showFlows, setShowFlows] = useState(true);

  // Helper for component status color
  const getPartColor = (partId, defaultColor) => {
    const part = ENGINE_PARTS.find((p) => p.id === partId);
    if (!part) return defaultColor;
    const status = getComponentStatus(part, telemetry, digitalTwin);
    if (status === 'CRITICAL') return '#ef4444';
    if (status === 'WARNING') return '#f59e0b';
    return defaultColor;
  };

  const isHighlighted = (partId) =>
    selectedPartId === partId || hoveredPartId === partId;

  return (
    <div
      className="relative w-full rounded-lg bg-slate-950/95 border border-slate-800 overflow-hidden shadow-2xl flex flex-col select-none font-mono"
      style={{ height }}
    >
      {/* Blueprint Grid Background */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: '24px 24px, 120px 120px, 120px 120px',
        }}
      />

      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 z-10 px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-b from-slate-950/95 via-slate-950/70 to-transparent">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-slate-200">
            2D TECHNICAL SCHEMATIC // BOXER-4
          </span>
          {/* 3D / 2D Mode Switcher */}
          <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => onSwitchMode('3D VIEW')}
              className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 text-xs transition-all flex items-center gap-1"
              title="Switch to 3D Virtual Engine Representation"
            >
              <Box className="w-3.5 h-3.5 text-slate-400" />
              <span>3D VIEW</span>
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-sky-950 border border-sky-500 text-sky-200 font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
              <span>2D SCHEMATIC</span>
            </button>
          </div>
          <div className="hidden sm:flex items-center p-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFlows((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-xs border flex items-center gap-1.5 transition-all ${
              showFlows
                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span>{showFlows ? 'HIDE FLOWS' : 'SHOW FLOWS'}</span>
          </button>

          {/* Names Toggle: [SHOW NAMES] [HIDE NAMES] */}
          <div className="flex items-center p-0.5 rounded bg-slate-900 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setShowLabels(true)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                showLabels
                  ? 'bg-sky-950 border border-sky-500 text-sky-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>SHOW NAMES</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLabels(false)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                !showLabels
                  ? 'bg-slate-800 border border-slate-600 text-slate-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>HIDE NAMES</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Diagram Canvas */}
      <div className="w-full h-full flex items-center justify-center p-4 pt-12 pb-8">
        <svg
          viewBox="0 0 1000 620"
          className="w-full h-full max-h-full transition-all"
          style={{ filter: 'drop-shadow(0 0 20px rgba(15, 23, 42, 0.8))' }}
        >
          <defs>
            {/* Arrow Markers for Flows */}
            <marker id="arrowAir" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            <marker id="arrowExhaust" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ea580c" />
            </marker>
            <marker id="arrowOil" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#eab308" />
            </marker>

            {/* Gradients */}
            <linearGradient id="crankcaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="cylinderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="headGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
            <linearGradient id="propellerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="exhaustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          {/* ------------------------------------------------------------- */}
          {/* 1. PROPELLER BLADES & REDUCTION SPINNER */}
          {/* ------------------------------------------------------------- */}
          {/* Propeller Blades */}
          <g
            onClick={() => onSelectPart('propeller')}
            onMouseEnter={() => setHoveredPartId('propeller')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {/* Top Blade */}
            <path
              d="M 120 310 C 90 220 80 120 70 40 C 95 40 105 110 125 310 Z"
              fill={isHighlighted('propeller') ? '#38bdf8' : 'url(#propellerGrad)'}
              stroke="#64748b"
              strokeWidth={isHighlighted('propeller') ? '3' : '1.5'}
            />
            {/* Bottom Blade */}
            <path
              d="M 120 310 C 90 400 80 500 70 580 C 95 580 105 510 125 310 Z"
              fill={isHighlighted('propeller') ? '#38bdf8' : 'url(#propellerGrad)'}
              stroke="#64748b"
              strokeWidth={isHighlighted('propeller') ? '3' : '1.5'}
            />
          </g>

          {/* Propeller Hub & Spinner */}
          <g
            onClick={() => onSelectPart('propeller_hub')}
            onMouseEnter={() => setHoveredPartId('propeller_hub')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <ellipse
              cx="120"
              cy="310"
              rx="25"
              ry="38"
              fill={isHighlighted('propeller_hub') ? '#38bdf8' : '#475569'}
              stroke="#94a3b8"
              strokeWidth={isHighlighted('propeller_hub') ? '3' : '2'}
            />
            {/* Front Spinner Cone */}
            <polygon
              points="120,285 70,310 120,335"
              fill={isHighlighted('propeller_hub') ? '#0284c7' : '#334155'}
              stroke="#94a3b8"
            />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 2. PROPELLER REDUCTION GEARBOX (PRGB) & CRANKSHAFT */}
          {/* ------------------------------------------------------------- */}
          <rect
            x="145"
            y="280"
            width="55"
            height="60"
            rx="4"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Crankshaft Centerline / Core Journal */}
          <g
            onClick={() => onSelectPart('crankshaft')}
            onMouseEnter={() => setHoveredPartId('crankshaft')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="200"
              y="300"
              width="360"
              height="20"
              rx="3"
              fill={isHighlighted('crankshaft') ? '#38bdf8' : '#94a3b8'}
              stroke="#cbd5e1"
              strokeWidth={isHighlighted('crankshaft') ? '3' : '1.5'}
            />
            {/* Crank Web Counterweights */}
            {[260, 340, 420, 500].map((cx, i) => (
              <rect
                key={i}
                x={cx}
                y={i % 2 === 0 ? 275 : 305}
                width="24"
                height="40"
                rx="4"
                fill={isHighlighted('crankshaft') ? '#0284c7' : '#64748b'}
                stroke="#cbd5e1"
              />
            ))}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 3. CENTRAL CRANKCASE (Cast Aluminum Housing) */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('crankcase')}
            onMouseEnter={() => setHoveredPartId('crankcase')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="200"
              y="220"
              width="370"
              height="180"
              rx="12"
              fill={isHighlighted('crankcase') ? '#0284c7' : 'url(#crankcaseGrad)'}
              stroke="#64748b"
              strokeWidth={isHighlighted('crankcase') ? '3' : '2'}
              opacity="0.9"
            />
            {/* Structural Stiffener Ribs */}
            {[250, 320, 390, 460, 530].map((rx, idx) => (
              <line
                key={idx}
                x1={rx}
                y1="225"
                x2={rx}
                y2="395"
                stroke="#475569"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            ))}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 4. OPPOSED CYLINDER BANKS (4-CYLINDER BOXER CONFIGURATION) */}
          {/* ------------------------------------------------------------- */}
          {/* LEFT BANK (TOP IN SCHEMATIC): Cylinders 1 & 2 */}
          {/* Cylinder 1 (Left Forward) */}
          <g
            onClick={() => onSelectPart('cylinder_1')}
            onMouseEnter={() => setHoveredPartId('cylinder_1')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="250"
              y="120"
              width="80"
              height="100"
              rx="4"
              fill={getPartColor('cylinder_1', isHighlighted('cylinder_1') ? '#38bdf8' : 'url(#cylinderGrad)')}
              stroke="#64748b"
              strokeWidth={isHighlighted('cylinder_1') ? '3' : '1.5'}
            />
            {/* Cylinder 1 Cooling Fins */}
            {[135, 150, 165, 180, 195, 210].map((fy, i) => (
              <line
                key={i}
                x1="240"
                y1={fy}
                x2="340"
                y2={fy}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* Cylinder 2 (Left Aft) */}
          <g
            onClick={() => onSelectPart('cylinder_2')}
            onMouseEnter={() => setHoveredPartId('cylinder_2')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="420"
              y="120"
              width="80"
              height="100"
              rx="4"
              fill={getPartColor('cylinder_2', isHighlighted('cylinder_2') ? '#38bdf8' : 'url(#cylinderGrad)')}
              stroke="#64748b"
              strokeWidth={isHighlighted('cylinder_2') ? '3' : '1.5'}
            />
            {/* Cylinder 2 Cooling Fins */}
            {[135, 150, 165, 180, 195, 210].map((fy, i) => (
              <line
                key={i}
                x1="410"
                y1={fy}
                x2="510"
                y2={fy}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* RIGHT BANK (BOTTOM IN SCHEMATIC): Cylinders 3 & 4 */}
          {/* Cylinder 3 (Right Forward) */}
          <g
            onClick={() => onSelectPart('cylinder_3')}
            onMouseEnter={() => setHoveredPartId('cylinder_3')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="290"
              y="400"
              width="80"
              height="100"
              rx="4"
              fill={getPartColor('cylinder_3', isHighlighted('cylinder_3') ? '#38bdf8' : 'url(#cylinderGrad)')}
              stroke="#64748b"
              strokeWidth={isHighlighted('cylinder_3') ? '3' : '1.5'}
            />
            {/* Cylinder 3 Cooling Fins */}
            {[415, 430, 445, 460, 475, 490].map((fy, i) => (
              <line
                key={i}
                x1="280"
                y1={fy}
                x2="380"
                y2={fy}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* Cylinder 4 (Right Aft) */}
          <g
            onClick={() => onSelectPart('cylinder_4')}
            onMouseEnter={() => setHoveredPartId('cylinder_4')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="460"
              y="400"
              width="80"
              height="100"
              rx="4"
              fill={getPartColor('cylinder_4', isHighlighted('cylinder_4') ? '#38bdf8' : 'url(#cylinderGrad)')}
              stroke="#64748b"
              strokeWidth={isHighlighted('cylinder_4') ? '3' : '1.5'}
            />
            {/* Cylinder 4 Cooling Fins */}
            {[415, 430, 445, 460, 475, 490].map((fy, i) => (
              <line
                key={i}
                x1="450"
                y1={fy}
                x2="550"
                y2={fy}
                stroke="#94a3b8"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 5. RECIPROCATING PISTONS (Internal Mechanical) */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('piston')}
            onMouseEnter={() => setHoveredPartId('piston')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {/* Piston 1 */}
            <rect
              x="260"
              y="145"
              width="60"
              height="35"
              rx="3"
              fill={isHighlighted('piston') ? '#38bdf8' : '#e2e8f0'}
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Connecting Rod 1 */}
            <line x1="290" y1="180" x2="272" y2="300" stroke="#94a3b8" strokeWidth="4" />

            {/* Piston 3 */}
            <rect
              x="300"
              y="440"
              width="60"
              height="35"
              rx="3"
              fill={isHighlighted('piston') ? '#38bdf8' : '#e2e8f0'}
              stroke="#475569"
              strokeWidth="1.5"
            />
            {/* Connecting Rod 3 */}
            <line x1="330" y1="440" x2="352" y2="320" stroke="#94a3b8" strokeWidth="4" />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 6. CYLINDER HEADS & VALVE COVERS */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('cylinder_head')}
            onMouseEnter={() => setHoveredPartId('cylinder_head')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {/* Top Bank Head 1 */}
            <rect
              x="245"
              y="85"
              width="90"
              height="35"
              rx="6"
              fill={isHighlighted('cylinder_head') ? '#38bdf8' : 'url(#headGrad)'}
              stroke="#cbd5e1"
              strokeWidth={isHighlighted('cylinder_head') ? '3' : '2'}
            />
            {/* Top Bank Head 2 */}
            <rect
              x="415"
              y="85"
              width="90"
              height="35"
              rx="6"
              fill={isHighlighted('cylinder_head') ? '#38bdf8' : 'url(#headGrad)'}
              stroke="#cbd5e1"
              strokeWidth={isHighlighted('cylinder_head') ? '3' : '2'}
            />
            {/* Bottom Bank Head 3 */}
            <rect
              x="285"
              y="500"
              width="90"
              height="35"
              rx="6"
              fill={isHighlighted('cylinder_head') ? '#38bdf8' : 'url(#headGrad)'}
              stroke="#cbd5e1"
              strokeWidth={isHighlighted('cylinder_head') ? '3' : '2'}
            />
            {/* Bottom Bank Head 4 */}
            <rect
              x="455"
              y="500"
              width="90"
              height="35"
              rx="6"
              fill={isHighlighted('cylinder_head') ? '#38bdf8' : 'url(#headGrad)'}
              stroke="#cbd5e1"
              strokeWidth={isHighlighted('cylinder_head') ? '3' : '2'}
            />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 7. IGNITION SYSTEM & SPARK PLUGS */}
          {/* ------------------------------------------------------------- */}
          {/* Dual CDI Ignition Module */}
          <g
            onClick={() => onSelectPart('ignition_system')}
            onMouseEnter={() => setHoveredPartId('ignition_system')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="210"
              y="185"
              width="35"
              height="30"
              rx="3"
              fill={isHighlighted('ignition_system') ? '#ef4444' : '#b91c1c'}
              stroke="#fca5a5"
              strokeWidth="1.5"
            />
            <text x="215" y="205" fill="#ffffff" fontSize="9" fontWeight="bold">
              CDI
            </text>
          </g>

          {/* Spark Plugs & High Tension Leads */}
          <g
            onClick={() => onSelectPart('spark_plug')}
            onMouseEnter={() => setHoveredPartId('spark_plug')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {[290, 460].map((px, i) => (
              <g key={i}>
                {/* Top Spark Plugs */}
                <rect
                  x={px - 6}
                  y="65"
                  width="12"
                  height="20"
                  fill={isHighlighted('spark_plug') ? '#38bdf8' : '#f87171'}
                  stroke="#ef4444"
                />
                <circle cx={px} cy="65" r="4" fill="#fbbf24" />
                {/* Red Lead Wires */}
                <path
                  d={`M 225 185 Q ${px - 20} 140 ${px} 65`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
              </g>
            ))}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 8. FUEL SYSTEM & FUEL INJECTORS */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('fuel_system')}
            onMouseEnter={() => setHoveredPartId('fuel_system')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {/* Common Fuel Rail */}
            <rect
              x="330"
              y="160"
              width="180"
              height="8"
              rx="3"
              fill={isHighlighted('fuel_system') ? '#38bdf8' : '#dc2626'}
              stroke="#f87171"
            />
          </g>

          {/* Fuel Injectors */}
          <g
            onClick={() => onSelectPart('fuel_injector')}
            onMouseEnter={() => setHoveredPartId('fuel_injector')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {[345, 435].map((ix, idx) => (
              <rect
                key={idx}
                x={ix}
                y="140"
                width="12"
                height="20"
                rx="2"
                fill={isHighlighted('fuel_injector') ? '#38bdf8' : '#ef4444'}
                stroke="#fecaca"
              />
            ))}
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 9. INTAKE MANIFOLD & AIR INTAKE / PLENUM */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('intake_manifold')}
            onMouseEnter={() => setHoveredPartId('intake_manifold')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <path
              d="M 570 280 Q 640 280 650 250 L 650 180 Q 640 140 500 140"
              fill="none"
              stroke={isHighlighted('intake_manifold') ? '#38bdf8' : '#ea580c'}
              strokeWidth="10"
              strokeLinecap="round"
            />
          </g>

          {/* Air Intake Scoop & Air Filter */}
          <g
            onClick={() => onSelectPart('air_intake')}
            onMouseEnter={() => setHoveredPartId('air_intake')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <polygon
              points="650,230 720,200 720,280 650,270"
              fill={isHighlighted('air_intake') ? '#38bdf8' : '#f97316'}
              stroke="#fdba74"
              strokeWidth="2"
            />
            {/* Filter Mesh */}
            <line x1="680" y1="215" x2="680" y2="275" stroke="#fed7aa" strokeWidth="2" />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 10. EXHAUST MANIFOLD & TURBOCHARGER */}
          {/* ------------------------------------------------------------- */}
          <g
            onClick={() => onSelectPart('exhaust_manifold')}
            onMouseEnter={() => setHoveredPartId('exhaust_manifold')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            {/* Exhaust Header Runners */}
            <path
              d="M 285 535 Q 350 570 450 570 L 600 570 Q 640 560 640 370"
              fill="none"
              stroke={getPartColor('exhaust_manifold', isHighlighted('exhaust_manifold') ? '#38bdf8' : 'url(#exhaustGrad)')}
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Turbocharger Turbine Casing */}
            <circle
              cx="640"
              cy="360"
              r="34"
              fill={isHighlighted('exhaust_manifold') ? '#38bdf8' : '#78350f'}
              stroke="#ea580c"
              strokeWidth="3"
            />
            <circle cx="640" cy="360" r="16" fill="#1e293b" stroke="#94a3b8" />
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 11. OIL SYSTEM & OIL FILTER */}
          {/* ------------------------------------------------------------- */}
          {/* Oil Sump at bottom of Crankcase */}
          <g
            onClick={() => onSelectPart('oil_system')}
            onMouseEnter={() => setHoveredPartId('oil_system')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="260"
              y="380"
              width="250"
              height="20"
              rx="4"
              fill={isHighlighted('oil_system') ? '#38bdf8' : '#ca8a04'}
              stroke="#fde047"
              strokeWidth="1.5"
            />
            {/* Oil Gallery Lines */}
            <path
              d="M 270 395 L 210 395 L 210 360"
              fill="none"
              stroke="#eab308"
              strokeWidth="4"
            />
          </g>

          {/* Oil Filter Canister */}
          <g
            onClick={() => onSelectPart('oil_filter')}
            onMouseEnter={() => setHoveredPartId('oil_filter')}
            onMouseLeave={() => setHoveredPartId(null)}
            className="cursor-pointer"
          >
            <rect
              x="180"
              y="340"
              width="35"
              height="45"
              rx="6"
              fill={isHighlighted('oil_filter') ? '#38bdf8' : '#eab308'}
              stroke="#fef08a"
              strokeWidth={isHighlighted('oil_filter') ? '3' : '2'}
            />
            <text x="186" y="366" fill="#1e293b" fontSize="8" fontWeight="bold">
              OIL
            </text>
          </g>

          {/* ------------------------------------------------------------- */}
          {/* 12. CALLOUT LABELS & LEADER LINES */}
          {/* ------------------------------------------------------------- */}
          {showLabels && (
            <g className="pointer-events-auto text-[11px] font-mono">
              {/* Propeller Label */}
              <g
                onClick={() => onSelectPart('propeller')}
                className="cursor-pointer hover:opacity-100"
              >
                <line x1="75" y1="40" x2="30" y2="40" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="5" y="25" width="80" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="12" y="39" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  PROPELLER
                </text>
              </g>

              {/* Propeller Hub Label */}
              <g
                onClick={() => onSelectPart('propeller_hub')}
                className="cursor-pointer"
              >
                <line x1="120" y1="285" x2="120" y2="240" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="75" y="220" width="90" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="82" y="234" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  PROP HUB
                </text>
              </g>

              {/* Cylinder Head Label */}
              <g
                onClick={() => onSelectPart('cylinder_head')}
                className="cursor-pointer"
              >
                <line x1="290" y1="85" x2="290" y2="35" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="235" y="15" width="110" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="242" y="29" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  CYLINDER HEAD
                </text>
              </g>

              {/* Air Intake Label */}
              <g
                onClick={() => onSelectPart('air_intake')}
                className="cursor-pointer"
              >
                <line x1="720" y1="240" x2="780" y2="240" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="780" y="230" width="90" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="788" y="244" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  AIR INTAKE
                </text>
              </g>

              {/* Exhaust Manifold Label */}
              <g
                onClick={() => onSelectPart('exhaust_manifold')}
                className="cursor-pointer"
              >
                <line x1="640" y1="394" x2="720" y2="440" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="720" y="430" width="130" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="728" y="444" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  EXHAUST / TURBO
                </text>
              </g>

              {/* Oil System Label */}
              <g
                onClick={() => onSelectPart('oil_system')}
                className="cursor-pointer"
              >
                <line x1="385" y1="400" x2="385" y2="570" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="340" y="570" width="90" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="348" y="584" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  OIL SYSTEM
                </text>
              </g>

              {/* Crankcase Label */}
              <g
                onClick={() => onSelectPart('crankcase')}
                className="cursor-pointer"
              >
                <line x1="385" y1="220" x2="385" y2="185" stroke="#38bdf8" strokeWidth="1.5" />
                <rect x="345" y="170" width="80" height="20" rx="3" fill="#0f172a" stroke="#38bdf8" />
                <text x="352" y="184" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  CRANKCASE
                </text>
              </g>
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 13. ANIMATED FLUID & GAS FLOW VECTORS */}
          {/* ------------------------------------------------------------- */}
          {showFlows && (
            <g className="pointer-events-none">
              {/* Air / Fuel Induction Flow */}
              <path
                d="M 700 240 L 640 240 Q 620 160 520 150 L 350 150"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="8 6"
                markerEnd="url(#arrowAir)"
              />
              <text x="560" y="135" fill="#38bdf8" fontSize="10" fontWeight="bold">
                AIR / FUEL INTAKE
              </text>

              {/* Exhaust Gas Evacuation Flow */}
              <path
                d="M 320 545 Q 400 580 500 580 L 620 580 Q 640 500 640 400"
                fill="none"
                stroke="#ea580c"
                strokeWidth="3.5"
                strokeDasharray="8 6"
                markerEnd="url(#arrowExhaust)"
              />
              <text x="440" y="605" fill="#ea580c" fontSize="10" fontWeight="bold">
                HOT EXHAUST FLOW
              </text>

              {/* Oil Lubrication Circuit Flow */}
              <path
                d="M 400 395 L 220 395 L 200 380 L 200 330 L 280 310"
                fill="none"
                stroke="#eab308"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                markerEnd="url(#arrowOil)"
              />
              <text x="215" y="415" fill="#eab308" fontSize="10" fontWeight="bold">
                LUBRICATION FLOW
              </text>

              {/* Mechanical Power Transfer Vector: PISTON -> ROD -> CRANKSHAFT -> GEARBOX -> PROPELLER */}
              <path
                d="M 260 110 L 260 150 L 170 150 L 120 150"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                markerEnd="url(#arrowAir)"
              />
              <text x="140" y="170" fill="#38bdf8" fontSize="9" fontWeight="bold">
                MECHANICAL POWER: PISTON → ROD → CRANKSHAFT → GEARBOX → PROPELLER
              </text>

              {/* Combustion Indicator Spark Burst in Cylinder 1 */}
              <circle cx="290" cy="115" r="14" fill="#fbbf24" opacity="0.6" />
              <circle cx="290" cy="115" r="6" fill="#ffffff" />
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Hint Strip */}
      <div className="absolute bottom-2 inset-x-4 flex items-center justify-between text-[10px] text-slate-500 pointer-events-none">
        <div>
          <span>CLICK ANY COMPONENT TO VIEW REAL-TIME TELEMETRY & FUNCTIONS</span>
        </div>
        <div className="hidden sm:block">
          <span>ORTHOGRAPHIC CUTAWAY // ROTAX 914/915 TURBOCHARGED EQUIVALENT</span>
        </div>
      </div>
    </div>
  );
}
