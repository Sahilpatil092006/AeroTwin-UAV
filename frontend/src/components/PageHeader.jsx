import React from 'react';

export default function PageHeader({
  systemTag = 'AEROTWIN // SYS',
  title,
  description,
  actions,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-5 mb-6 border-b border-slate-800">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider">
            {systemTag}
          </span>
        </div>
        <h1 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
      )}
    </div>
  );
}
