import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({
  message = 'Acquiring telemetry link...',
  subtext = 'Synchronizing with AeroTwin simulation engine',
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded bg-slate-900/40 border border-dashed border-slate-800">
      <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
      <h4 className="text-sm font-mono font-medium text-slate-300 tracking-wider uppercase">
        {message}
      </h4>
      {subtext && <p className="text-xs font-mono text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}
