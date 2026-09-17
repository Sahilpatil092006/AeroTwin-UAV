import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';

const DEFAULT_SERIES = [
  { key: 'rpm', name: 'RPM', color: '#06b6d4', group: 'rotational' },
  { key: 'egt', name: 'EGT (°C)', color: '#f59e0b', group: 'thermal' },
  { key: 'cht', name: 'CHT (°C)', color: '#f43f5e', group: 'thermal' },
  { key: 'vibration', name: 'Vibration (g)', color: '#a855f7', group: 'rotational' },
];

export default function TelemetryStreamChart({
  title = 'Real-Time Telemetry Stream',
  data = [],
  series = DEFAULT_SERIES,
  height = 260,
  emptyMessage = 'Waiting for real-time telemetry...',
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const hasData = Array.isArray(data) && data.length > 0;

  const visibleSeries = useMemo(() => {
    if (activeFilter === 'thermal') {
      return series.filter((s) => s.key === 'cht' || s.key === 'egt');
    }
    if (activeFilter === 'rotational') {
      return series.filter((s) => s.key === 'rpm' || s.key === 'vibration');
    }
    return series;
  }, [series, activeFilter]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider uppercase">
            {title}
          </span>
        </div>

        {/* View Filter Pills & Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded bg-slate-900 border border-slate-800 p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'all'
                  ? 'bg-sky-950 text-sky-300 font-semibold border border-sky-800/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('thermal')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'thermal'
                  ? 'bg-sky-950 text-sky-300 font-semibold border border-sky-800/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              THERMAL
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('rotational')}
              className={`px-2 py-0.5 rounded transition-colors ${
                activeFilter === 'rotational'
                  ? 'bg-sky-950 text-sky-300 font-semibold border border-sky-800/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ROTATIONAL
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
            {visibleSeries.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="w-full rounded bg-slate-950/70 border border-slate-800/90 flex items-center justify-center relative overflow-hidden"
        style={{ height }}
      >
        {!hasData ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-xs font-mono text-slate-400">{emptyMessage}</p>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              CHANNELS: RPM // EGT // CHT // VIB // OIL // LOAD
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: 4,
                  fontSize: 11,
                  fontFamily: 'monospace',
                }}
              />
              {visibleSeries.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
