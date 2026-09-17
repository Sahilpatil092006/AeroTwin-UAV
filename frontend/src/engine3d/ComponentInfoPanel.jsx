import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Activity,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { ENGINE_PARTS, getComponentStatus } from './enginePartsData';

export default function ComponentInfoPanel({
  selectedPartId,
  onSelectPart,
  telemetry = {},
  digitalTwin = {},
  isConnected = false,
}) {
  const selectedPart =
    ENGINE_PARTS.find((p) => p.id === selectedPartId) || ENGINE_PARTS[0];

  const status = getComponentStatus(selectedPart, telemetry, digitalTwin);
  const liveVal =
    isConnected && telemetry[selectedPart.telemetryKey] !== undefined
      ? Number(telemetry[selectedPart.telemetryKey]).toFixed(1)
      : '--';

  let statusBg = 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300';
  let StatusIcon = ShieldCheck;
  let statusGlow = 'rgba(16, 185, 129, 0.2)';

  if (status === 'CRITICAL') {
    statusBg = 'bg-rose-950/80 border-rose-600/70 text-rose-300';
    StatusIcon = ShieldAlert;
    statusGlow = 'rgba(239, 68, 68, 0.3)';
  } else if (status === 'WARNING') {
    statusBg = 'bg-amber-950/80 border-amber-600/70 text-amber-300';
    StatusIcon = AlertTriangle;
    statusGlow = 'rgba(245, 158, 11, 0.25)';
  }

  // Calculate percentage within nominal range for visual bar
  let percentage = 50;
  if (
    isConnected &&
    telemetry[selectedPart.telemetryKey] !== undefined &&
    selectedPart.nominalMin &&
    selectedPart.nominalMax
  ) {
    const raw = Number(telemetry[selectedPart.telemetryKey]);
    const min = selectedPart.nominalMin;
    const max = selectedPart.warningMax || selectedPart.nominalMax * 1.15;
    percentage = Math.max(5, Math.min(100, ((raw - min) / (max - min)) * 100));
  }

  return (
    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-5 shadow-xl font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-slate-400 font-bold tracking-wider uppercase text-[11px]">
            COMPONENT INFORMATION & DIAGNOSTICS
          </span>
        </div>
        <div
          className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold shadow-md transition-all ${statusBg}`}
          style={{ boxShadow: `0 0 12px ${statusGlow}` }}
        >
          <StatusIcon className="w-3.5 h-3.5 animate-pulse" />
          <span>STATUS: {status}</span>
        </div>
      </div>

      {/* Main Grid: Part Name, Category & Function */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Part Identity & Function */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline gap-3">
            <h3 className="text-lg font-bold text-white tracking-wide">
              {selectedPart.name}
            </h3>
            <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/60 text-sky-300 text-[10px]">
              {selectedPart.category}
            </span>
          </div>

          <div className="p-3 rounded bg-slate-950/60 border border-slate-800 text-slate-300 leading-relaxed text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1 text-[10px] font-semibold uppercase">
              <Info className="w-3 h-3 text-sky-400" />
              <span>Functional Purpose:</span>
            </div>
            {selectedPart.function}
          </div>
        </div>

        {/* Right Column: Live Telemetry & Normal Range Gauge */}
        <div className="p-3.5 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-sky-400" />
                <span>RELATED TELEMETRY</span>
              </span>
              <span className="text-slate-500">[{selectedPart.telemetryKey.toUpperCase()}]</span>
            </div>
            <div className="text-slate-300 text-[11px] font-semibold mb-2">
              {selectedPart.telemetryLabel}
            </div>

            {/* Live Readout Value */}
            <div className="flex items-baseline justify-between py-1.5 px-2 rounded bg-slate-900/90 border border-slate-800">
              <span className="text-slate-400 text-[10px]">LIVE CURRENT:</span>
              <div className="text-base font-bold text-white flex items-baseline gap-1">
                <span className={status === 'CRITICAL' ? 'text-rose-400' : status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}>
                  {liveVal}
                </span>
                <span className="text-xs text-slate-400 font-normal">{selectedPart.unit}</span>
              </div>
            </div>

            {/* Paired CHT & EGT values if inspecting any cylinder */}
            {selectedPart.id.startsWith('cylinder_') && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px]">
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">CURRENT CHT</span>
                  <span className="font-bold text-amber-300">
                    {isConnected && telemetry?.cht ? `${Number(telemetry.cht).toFixed(1)} °C` : '--'}
                  </span>
                </div>
                <div className="p-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">CURRENT EGT</span>
                  <span className="font-bold text-orange-400">
                    {isConnected && telemetry?.egt ? `${Number(telemetry.egt).toFixed(1)} °C` : '--'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Normal Operating Range Meter */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>NORMAL RANGE:</span>
              <span className="text-sky-300 font-semibold">{selectedPart.normalRange}</span>
            </div>

            {/* Progress Bar Gauge */}
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  status === 'CRITICAL'
                    ? 'bg-rose-500'
                    : status === 'WARNING'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Component Selection Strip */}
      <div className="mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-[10px] text-slate-500 block mb-2 font-bold uppercase tracking-wider">
          FAST COMPONENT SELECTOR (20 CRITICAL PARTS):
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          {ENGINE_PARTS.map((part) => {
            const isSelected = part.id === selectedPartId;
            const pStatus = getComponentStatus(part, telemetry, digitalTwin);
            const dotColor =
              pStatus === 'CRITICAL'
                ? 'bg-rose-500'
                : pStatus === 'WARNING'
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <button
                key={part.id}
                type="button"
                onClick={() => onSelectPart(part.id)}
                className={`px-2 py-1 rounded text-[10px] border flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-sky-950 border-sky-500 text-sky-200 font-bold shadow'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span>{part.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
