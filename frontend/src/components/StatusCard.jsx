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
    <div className="flex flex-col justify-between p-4 rounded bg-slate-900/70 border border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
      </div>

      <div className="my-3 flex items-center gap-2.5">
        <span className={`w-3 h-3 rounded-full ${cfg.dotColor} shrink-0`} />
        <span className={`text-lg font-bold font-mono tracking-wide ${cfg.textColor}`}>
          {cfg.label}
        </span>
      </div>

      <div className="text-xs text-slate-400 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="truncate">{details}</span>
        {timestamp && <span className="text-slate-500 shrink-0 text-[10px]">{timestamp}</span>}
      </div>
    </div>
  );
}
