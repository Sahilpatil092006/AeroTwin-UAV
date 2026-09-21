import React from 'react';

/**
 * AeroTwinLogo - Professional high-contrast aerospace/defence logo for AeroTwin-UAV.
 * Combines an abstract geometric defence shield with a tactical UAV delta silhouette.
 * Designed for maximum visibility and clarity on dark aerospace navy backgrounds.
 */
export default function AeroTwinLogo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label="AeroTwin-UAV Logo"
      role="img"
    >
      <defs>
        {/* High-contrast shield background gradient */}
        <linearGradient id="aeroShieldBg" x1="24" y1="3" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#131c2e" />
          <stop offset="100%" stopColor="#0b1120" />
        </linearGradient>

        {/* Crisp aerospace border gradient */}
        <linearGradient id="aeroShieldBorder" x1="7" y1="3.5" x2="41" y2="43.5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>

        {/* Tactical airframe gradient */}
        <linearGradient id="aeroUavGrad" x1="24" y1="11" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="35%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Outer Geometric Defence Shield */}
      <path
        d="M24 3.5L41 9.5V23.5C41 33.5 24 43.5 24 43.5C24 43.5 7 33.5 7 23.5V9.5L24 3.5Z"
        fill="url(#aeroShieldBg)"
        stroke="url(#aeroShieldBorder)"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Inner Tactical Reticle Line */}
      <path
        d="M24 6.5L38 11.5V22.5C38 31 24 39.5 24 39.5C24 39.5 10 31 10 22.5V11.5L24 6.5Z"
        stroke="#38bdf8"
        strokeWidth="0.85"
        strokeOpacity="0.5"
        strokeDasharray="4 2"
      />

      {/* Tactical UAV Delta Airframe */}
      <path
        d="M24 11L33 25.5L26.5 24.5L24 20.5L21.5 24.5L15 25.5L24 11Z"
        fill="url(#aeroUavGrad)"
        stroke="#7dd3fc"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />

      {/* Wing Leading Edge Light Accents */}
      <path
        d="M24 11.5L32.5 25M24 11.5L15.5 25"
        stroke="#ffffff"
        strokeWidth="0.85"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />

      {/* Twin Propulsion Thrust Vectors */}
      <path
        d="M20.5 26.5L19 32.5L21.5 30.5L24 34L26.5 30.5L29 32.5L27.5 26.5"
        stroke="#38bdf8"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Digital Sensor Hub / Core Dot */}
      <circle cx="24" cy="22" r="1.5" fill="#ffffff" />
    </svg>
  );
}
