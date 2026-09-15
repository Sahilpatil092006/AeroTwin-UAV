import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorState({
  title = 'Telemetry Link Disruption',
  message = 'Unable to establish connection with AeroTwin telemetry stream.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded bg-rose-950/10 border border-rose-900/30">
      <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 mb-3 border border-rose-500/20">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-mono font-semibold text-rose-300 uppercase tracking-wide">
        {title}
      </h4>
      <p className="text-xs font-mono text-slate-400 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RECONNECT</span>
        </button>
      )}
    </div>
  );
}
