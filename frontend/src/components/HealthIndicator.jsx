import React from 'react';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';

export default function HealthIndicator({
  label = 'Health Index',
  value = null,
  status = STATUS_TYPES.IDLE,
  subtext = 'Awaiting telemetry calculation',
}) {
  const statusCfg = getStatusConfig(status);
  const displayValue = value !== null && value !== undefined ? `${value}%` : '--';

  return (
    <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-[#0e1422]/90 border border-slate-800/80 shadow-sm">
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono tracking-wider">
        <span className="font-semibold text-[11px]">{(label || '').toUpperCase()}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusCfg.badgeClass}`}>
          {statusCfg.label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold font-mono tracking-tight ${statusCfg.textColor}`}>
          {displayValue}
        </span>
      </div>
      <div className="w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${statusCfg.dotColor}`}
          style={{ width: typeof value === 'number' ? `${Math.min(100, Math.max(0, value))}%` : '0%' }}
        />
      </div>
      <p className="text-[10px] text-slate-400 font-mono">{subtext}</p>
    </div>
  );
}
