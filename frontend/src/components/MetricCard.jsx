import React from 'react';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';

export default function MetricCard({
  title,
  value = null,
  unit = '',
  status = STATUS_TYPES.IDLE,
  subtext = 'Waiting for telemetry',
  icon: Icon,
}) {
  const cfg = getStatusConfig(status);
  const displayValue = value !== null && value !== undefined ? value : '--';

  return (
    <div className="flex flex-col justify-between p-4 rounded bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-medium text-slate-400 tracking-wider uppercase truncate">
          {title}
        </span>
        {Icon && <Icon className="w-4 h-4 text-slate-500 shrink-0" />}
      </div>

      <div className="my-2 flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold font-mono tracking-tight ${cfg.textColor}`}>
          {displayValue}
        </span>
        {unit && <span className="text-xs font-mono text-slate-500">{unit}</span>}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="truncate">{subtext}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotColor}`} />
      </div>
    </div>
  );
}
