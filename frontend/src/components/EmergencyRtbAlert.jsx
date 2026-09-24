import React from 'react';
import { AlertOctagon, Navigation, Radio, CheckCircle2, Home } from 'lucide-react';

/**
 * Professional Aerospace/Defence Emergency Return-to-Base (RTB) Status Display
 *
 * Requirements:
 * 1. Only renders when rtb_active is TRUE OR rtb_completed is TRUE for the active/selected UAV.
 * 2. When inactive and not completed, returns null.
 * 3. Shows:
 *    - Active State:
 *        🔴 EMERGENCY RTB ACTIVE
 *        UAV: UAV-XXX
 *        Reason: <existing RTB trigger reason>
 *        Destination: HOME BASE
 *        Status: RETURNING TO BASE
 *    - Completed State (RTB-05):
 *        🟢 RTB COMPLETE
 *        UAV: UAV-XXX
 *        Reason: <existing RTB trigger reason>
 *        Destination: HOME BASE
 *        Status: RTB COMPLETE — ARRIVED AT HOME BASE
 * 4. Professional aerospace/defence style: compact, clearly visible, not a huge popup, responsive.
 */
export default function EmergencyRtbAlert({ rtb }) {
  const isComplete = Boolean(rtb?.rtb_completed || rtb?.status === 'COMPLETE');
  const isActive = Boolean(rtb?.rtb_active);

  if (!rtb || (!isActive && !isComplete)) {
    return null;
  }

  const uavId = rtb.uav_id || 'UNKNOWN';
  const triggerReason = rtb.trigger_reason || 'Critical threshold deviation detected';
  const destination = rtb.destination ? rtb.destination.replace(/_/g, ' ') : 'HOME BASE';
  const statusDisplay = isComplete
    ? 'RTB COMPLETE — ARRIVED AT HOME BASE'
    : 'RETURNING TO BASE';

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="emergency-rtb-alert"
      className={`relative z-10 w-full overflow-hidden rounded-lg p-3.5 font-mono text-xs select-text my-2 border-2 shadow-xl ${
        isComplete
          ? 'bg-gradient-to-r from-emerald-950 via-slate-950 to-slate-950 border-emerald-500 shadow-emerald-950/40'
          : 'bg-gradient-to-r from-rose-950 via-red-950/90 to-slate-950 border-rose-500 shadow-rose-950/50'
      }`}
    >
      {/* Background strobe / grid overlay */}
      <div
        className={`absolute inset-0 opacity-10 pointer-events-none [background-size:16px_16px] ${
          isComplete
            ? 'bg-[radial-gradient(#10b981_1px,transparent_1px)]'
            : 'bg-[radial-gradient(#f43f5e_1px,transparent_1px)]'
        }`}
      />

      {/* Header Bar */}
      <div
        className={`relative flex flex-wrap items-center justify-between gap-2 border-b pb-2 mb-2.5 ${
          isComplete ? 'border-emerald-800/60' : 'border-rose-800/60'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Pulsing beacon indicator */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-80 ${
                isComplete ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 shadow-sm ${
                isComplete ? 'bg-emerald-500 shadow-emerald-500' : 'bg-rose-500 shadow-rose-500'
              }`}
            />
          </span>
          <span className="text-base leading-none">{isComplete ? '🟢' : '🔴'}</span>
          <h3
            className={`font-black tracking-wider text-xs sm:text-sm uppercase flex items-center gap-1.5 ${
              isComplete ? 'text-emerald-100' : 'text-rose-100'
            }`}
          >
            <span>{isComplete ? 'RTB COMPLETE' : 'EMERGENCY RTB ACTIVE'}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm border ${
              isComplete
                ? 'bg-emerald-900/90 border-emerald-500/80 text-emerald-200'
                : 'bg-rose-900/90 border-rose-500/80 text-rose-200'
            }`}
          >
            {isComplete ? (
              <>
                <Home className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>ARRIVED AT HOME BASE</span>
              </>
            ) : (
              <>
                <Radio className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
                <span>AUTONOMOUS RECOVERY</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main Grid: UAV | Reason | Destination | Status */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* UAV */}
        <div
          className={`bg-black/50 rounded p-2 flex flex-col justify-center border ${
            isComplete ? 'border-emerald-900/70' : 'border-rose-900/70'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isComplete ? 'text-emerald-300/80' : 'text-rose-300/80'
            }`}
          >
            UAV:
          </span>
          <span className="font-black text-white text-sm tracking-wide mt-0.5">
            {uavId}
          </span>
        </div>

        {/* Reason */}
        <div
          className={`bg-black/50 rounded p-2 flex flex-col justify-center sm:col-span-1 lg:col-span-1 border ${
            isComplete ? 'border-emerald-900/70' : 'border-rose-900/70'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isComplete ? 'text-emerald-300/80' : 'text-rose-300/80'
            }`}
          >
            Reason:
          </span>
          <span
            className={`font-semibold text-[11px] leading-snug mt-0.5 break-words line-clamp-2 ${
              isComplete ? 'text-emerald-200' : 'text-rose-200'
            }`}
            title={triggerReason}
          >
            {triggerReason}
          </span>
        </div>

        {/* Destination */}
        <div
          className={`bg-black/50 rounded p-2 flex flex-col justify-center border ${
            isComplete ? 'border-emerald-900/70' : 'border-rose-900/70'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isComplete ? 'text-emerald-300/80' : 'text-rose-300/80'
            }`}
          >
            Destination:
          </span>
          <span className="font-bold text-slate-100 text-xs mt-0.5 flex items-center gap-1.5">
            {isComplete ? (
              <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{destination}</span>
          </span>
        </div>

        {/* Status */}
        <div
          className={`bg-black/50 rounded p-2 flex flex-col justify-center border ${
            isComplete ? 'border-emerald-900/70' : 'border-rose-900/70'
          }`}
        >
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isComplete ? 'text-emerald-300/80' : 'text-rose-300/80'
            }`}
          >
            Status:
          </span>
          <span
            className={`font-black text-xs mt-0.5 flex items-center gap-1.5 tracking-wide ${
              isComplete ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isComplete ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline-block shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
            )}
            <span>{statusDisplay}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
