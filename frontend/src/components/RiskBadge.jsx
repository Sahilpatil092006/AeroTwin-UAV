import React from 'react';
import { STATUS_TYPES, getStatusConfig } from '../utils/status';

export default function RiskBadge({ level = 'UNKNOWN', className = '' }) {
  let statusKey = STATUS_TYPES.UNKNOWN;
  const upper = (level || '').toUpperCase();

  if (['LOW', 'NOMINAL', 'HEALTHY'].includes(upper)) {
    statusKey = STATUS_TYPES.HEALTHY;
  } else if (['MEDIUM', 'MODERATE', 'WARNING', 'ELEVATED'].includes(upper)) {
    statusKey = STATUS_TYPES.WARNING;
  } else if (['HIGH', 'CRITICAL', 'SEVERE'].includes(upper)) {
    statusKey = STATUS_TYPES.CRITICAL;
  } else if (['INFO', 'ADVISORY'].includes(upper)) {
    statusKey = STATUS_TYPES.INFORMATION;
  }

  const cfg = getStatusConfig(statusKey);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono font-semibold border ${cfg.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {upper || 'UNKNOWN'}
    </span>
  );
}
