import React from 'react';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';

export default function StatusCard({
  title,
  status = STATUS_TYPES.IDLE,
  details = 'Waiting for engine telemetry link...',
  timestamp = null,
  icon: Icon,
}) {
  const cfg = getStatusConfig(status);

  return (
    <div className="flex flex-col justify-between p-3.5 rounded-lg bg-[#0e1422]/90 border border-slate-800/80 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
      </div>

      <div className="my-2.5 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dotColor} shrink-0`} />
        <span className={`text-base font-bold font-mono tracking-wide ${cfg.textColor}`}>
          {cfg.label}
        </span>
      </div>

      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/70">
        <span className="truncate">{details}</span>
        {timestamp && <span className="text-slate-500 shrink-0 text-[10px]">{timestamp}</span>}
      </div>
    </div>
  );
}
