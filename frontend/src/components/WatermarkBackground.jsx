import React from 'react';

/**
 * WatermarkBackground - Professional, subtle aerospace/defence watermark.
 * Features:
 * - Abstract geometric shield
 * - Generic tactical UAV / drone silhouette
 * - Fine technical reticle / coordinate grid
 * - AeroTwin-UAV system text
 * 
 * Strict requirement: Opacity ~3.5%, non-interactive, no official military logos.
 */
export default function WatermarkBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center"
      aria-hidden="true"
      style={{ opacity: 0.035 }}
    >
      <svg
        className="w-[1200px] h-[1200px] max-w-none text-slate-300"
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Fine Technical Coordinate Grid */}
        <g stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 8">
          <circle cx="500" cy="500" r="460" />
          <circle cx="500" cy="500" r="380" />
          <circle cx="500" cy="500" r="280" />
          <line x1="40" y1="500" x2="960" y2="500" />
          <line x1="500" y1="40" x2="500" y2="960" />
          <line x1="175" y1="175" x2="825" y2="825" strokeDasharray="2 12" />
          <line x1="825" y1="175" x2="175" y2="825" strokeDasharray="2 12" />
        </g>

        {/* Reticle Tick Marks */}
        <g stroke="currentColor" strokeWidth="1.5">
          <line x1="500" y1="30" x2="500" y2="55" />
          <line x1="500" y1="945" x2="500" y2="970" />
          <line x1="30" y1="500" x2="55" y2="500" />
          <line x1="945" y1="500" x2="970" y2="500" />
        </g>

        {/* Abstract Geometric Shield Outline */}
        <g stroke="currentColor" strokeWidth="2.5" fill="none">
          {/* Outer Shield */}
          <path d="M 500 140 L 720 220 L 700 520 C 690 680 500 830 500 830 C 500 830 310 680 300 520 L 280 220 Z" />
          {/* Inner Inset Shield */}
          <path
            d="M 500 175 L 690 245 L 675 505 C 665 645 500 780 500 780 C 500 780 335 645 325 505 L 310 245 Z"
            strokeWidth="1.2"
            strokeDasharray="8 6"
          />
        </g>

        {/* Generic Tactical / MALE UAV Drone Silhouette (Top-Down Vector) */}
        <g fill="currentColor" transform="translate(500, 485) scale(1.15)">
          {/* Fuselage / Central Pod */}
          <path d="M 0 -115 C 6 -90 9 -50 9 0 C 9 60 6 95 0 105 C -6 95 -9 60 -9 0 C -9 -50 -6 -90 0 -115 Z" />
          {/* Main High-Aspect Swept Wings */}
          <path d="M 0 -15 L 180 5 L 180 18 L 8 12 L -8 12 L -180 18 L -180 5 Z" />
          {/* Winglet tips */}
          <path d="M 180 5 L 184 -5 L 180 18 Z" />
          <path d="M -180 5 L -184 -5 L -180 18 Z" />
          {/* Twin Tail Booms */}
          <rect x="22" y="5" width="3" height="110" />
          <rect x="-25" y="5" width="3" height="110" />
          {/* Inverted V / Horizontal Tailplane */}
          <path d="M -32 110 L 32 110 L 26 117 L -26 117 Z" />
          <path d="M 22 110 L 34 85 L 30 85 L 20 110 Z" />
          <path d="M -22 110 L -34 85 L -30 85 L -20 110 Z" />
          {/* Pusher Propeller Hub */}
          <ellipse cx="0" cy="108" rx="8" ry="3" />
        </g>

        {/* Technical Typography & Grid Labels */}
        <g fill="currentColor" fontFamily="monospace" fontSize="11" letterSpacing="0.3em" textAnchor="middle">
          <text x="500" y="320">AEROTWIN-UAV</text>
          <text x="500" y="340" fontSize="8" letterSpacing="0.2em">
            INTEGRATED DEFENCE DIGITAL TWIN
          </text>
          <text x="500" y="700" fontSize="8" letterSpacing="0.25em">
            SYSTEM TELEMETRY // SURVEILLANCE MATRIX
          </text>
        </g>

        {/* Compass / Coordinate Corner Markers */}
        <g fill="currentColor" fontFamily="monospace" fontSize="8" letterSpacing="0.1em">
          <text x="70" y="80">GRID: 44N-E28</text>
          <text x="70" y="930">SEC: DEF-AERO-01</text>
          <text x="830" y="80">STATUS: NOMINAL</text>
          <text x="830" y="930">TWIN: SYNCHRONIZED</text>
        </g>
      </svg>
    </div>
  );
}
