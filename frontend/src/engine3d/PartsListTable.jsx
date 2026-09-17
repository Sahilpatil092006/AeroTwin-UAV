import React, { useState } from 'react';
import { ENGINE_PARTS, getComponentStatus } from './enginePartsData';
import { Search, ChevronRight, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function PartsListTable({
  selectedPartId,
  onSelectPart,
  telemetry = {},
  digitalTwin = {},
  isConnected = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParts = ENGINE_PARTS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.function.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-5 shadow-xl font-mono text-xs select-none">
      {/* Search & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800/80">
        <div>
          <h4 className="text-sm font-bold text-white tracking-wide">
            AERO PISTON ENGINE PARTS LIST (20 SUBSYSTEMS)
          </h4>
          <span className="text-[10px] text-slate-400">
            Click any row to focus 3D camera / highlight in 2D schematic & inspect live parameters.
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search component..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 rounded bg-slate-950/90 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-950/40">
              <th className="py-2.5 px-3 w-12">No.</th>
              <th className="py-2.5 px-3">Component</th>
              <th className="py-2.5 px-3">Subsystem</th>
              <th className="py-2.5 px-3">Monitored Telemetry</th>
              <th className="py-2.5 px-3">Live Value</th>
              <th className="py-2.5 px-3 text-right">Health Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredParts.map((part, index) => {
              const isSelected = part.id === selectedPartId;
              const status = getComponentStatus(part, telemetry, digitalTwin);
              const liveVal =
                isConnected && telemetry[part.telemetryKey] !== undefined
                  ? `${Number(telemetry[part.telemetryKey]).toFixed(1)} ${part.unit}`
                  : `-- ${part.unit}`;

              let statusBadge = 'bg-emerald-950/50 text-emerald-400 border-emerald-800/60';
              let StatusIcon = ShieldCheck;
              if (status === 'CRITICAL') {
                statusBadge = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
                StatusIcon = ShieldAlert;
              } else if (status === 'WARNING') {
                statusBadge = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
                StatusIcon = AlertTriangle;
              }

              return (
                <tr
                  key={part.id}
                  onClick={() => onSelectPart(part.id)}
                  className={`cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-sky-950/60 border-l-4 border-sky-400 text-sky-100 font-semibold'
                      : 'hover:bg-slate-800/40 text-slate-300'
                  }`}
                >
                  <td className="py-2 px-3 text-slate-500 font-bold">{index + 1}</td>
                  <td className="py-2 px-3">
                    <span className="text-white block">{part.name}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-xs block font-normal">
                      {part.function}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                      {part.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-300">
                    {part.telemetryLabel}
                  </td>
                  <td className="py-2 px-3 font-bold text-white">{liveVal}</td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${statusBadge}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{status}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
