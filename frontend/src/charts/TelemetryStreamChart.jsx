import React from 'react';
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

export default function TelemetryStreamChart({
  title = 'Real-Time Telemetry Stream',
  data = [],
  series = [
    { key: 'rpm', name: 'RPM', color: '#06b6d4' },
    { key: 'egt', name: 'EGT Avg (°C)', color: '#f59e0b' },
    { key: 'map', name: 'MAP (inHg)', color: '#10b981' },
  ],
  height = 260,
  emptyMessage = 'Waiting for real-time telemetry...',
}) {
  const hasData = Array.isArray(data) && data.length > 0;

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider uppercase">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.name}</span>
            </span>
          ))}
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
              CHANNELS: RPM // CHT // EGT // MAP // OIL // VIB
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
              {series.map((s) => (
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
