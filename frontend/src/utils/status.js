/**
 * Status and Color System for AeroTwin-UAV Aerospace Interface
 * HEALTHY: green (emerald)
 * WARNING: yellow/amber (amber)
 * CRITICAL: red (rose/red)
 * INFORMATION: blue (cyan/sky)
 */

export const STATUS_TYPES = {
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  INFORMATION: 'INFORMATION',
  IDLE: 'IDLE',
  UNKNOWN: 'UNKNOWN',
};

export const STATUS_CONFIG = {
  [STATUS_TYPES.HEALTHY]: {
    label: 'HEALTHY',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  [STATUS_TYPES.WARNING]: {
    label: 'WARNING',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-400',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  [STATUS_TYPES.CRITICAL]: {
    label: 'CRITICAL',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    dotColor: 'bg-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  [STATUS_TYPES.INFORMATION]: {
    label: 'INFO',
    textColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    dotColor: 'bg-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  [STATUS_TYPES.IDLE]: {
    label: 'STANDBY',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-800/40',
    borderColor: 'border-slate-700/40',
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-800/40 text-slate-400 border-slate-700/40',
  },
  [STATUS_TYPES.UNKNOWN]: {
    label: 'NO SIGNAL',
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-900/40',
    borderColor: 'border-slate-800',
    dotColor: 'bg-slate-600',
    badgeClass: 'bg-slate-900/40 text-slate-500 border-slate-800',
  },
};

export const getStatusConfig = (status) => {
  const normalized = (status || '').toUpperCase();
  return STATUS_CONFIG[normalized] || STATUS_CONFIG[STATUS_TYPES.UNKNOWN];
};
