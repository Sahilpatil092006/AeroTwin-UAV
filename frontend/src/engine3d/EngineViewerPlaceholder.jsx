import React from 'react';
import { Box, Crosshair } from 'lucide-react';

export default function EngineViewerPlaceholder({
  height = 360,
  engineModel = 'Rotax 914 / 915 iS Turbocharged Piston Engine',
}) {
  return (
    <div
      className="relative w-full rounded bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center overflow-hidden"
      style={{ height }}
    >
      {/* Aerospace HUD overlay grid marks */}
      <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />

      {/* Viewport Corner Reticles */}
      <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-600 flex items-center gap-1">
        <Crosshair className="w-3 h-3 text-sky-500/70" />
        <span>CAM: ORBIT_3D // FOV 45°</span>
      </div>

      <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-500">
        MODEL: {engineModel}
      </div>

      <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-600">
        HEATMAP: CHT / EGT GRADIENTS [STANDBY]
      </div>

      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-slate-600">
        R3F ENGINE CANVAS
      </div>

      {/* Center placeholder info */}
      <div className="relative z-10 flex flex-col items-center text-center p-6">
        <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
          <Box className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-mono font-semibold text-slate-200 tracking-wide uppercase">
          3D Digital Twin Viewport
        </h4>
        <p className="text-xs font-mono text-slate-400 mt-1 max-w-sm">
          Interactive Three.js / React Three Fiber scene ready for CAD/GLTF mesh inspection and real-time thermal overlay.
        </p>
        <div className="mt-3 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
          MESH STATUS: AWAITING ASSET BINDING
        </div>
      </div>
    </div>
  );
}
