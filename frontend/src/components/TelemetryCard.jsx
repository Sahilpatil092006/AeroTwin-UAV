import React from 'react';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';

export default function TelemetryCard({
  label,
  code,
  value = null,
  unit = '',
  nominalRange = '',
  status = STATUS_TYPES.IDLE,
}) {
  const cfg = getStatusConfig(status);
  const displayValue = value !== null && value !== undefined ? value : '--';

  return (
    <div className="flex flex-col justify-between p-3 rounded-lg bg-[#0e1422]/90 border border-slate-800/80 hover:border-slate-700/80 transition-colors shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
          <span className="text-[11px] font-medium text-slate-300 truncate">{label}</span>
        </div>
        {code && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
            {code}
          </span>
        )}
      </div>

      <div className="my-2 flex items-baseline gap-1.5">
        <span className={`text-lg font-bold font-mono tracking-tight ${cfg.textColor}`}>
          {displayValue}
        </span>
        {unit && <span className="text-[11px] font-mono text-slate-400">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="truncate">RNG: {nominalRange || 'TBD'}</span>
        <span className={cfg.textColor}>{cfg.label}</span>
      </div>
    </div>
  );
}
