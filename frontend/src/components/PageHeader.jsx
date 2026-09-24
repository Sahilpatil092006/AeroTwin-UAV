import React from 'react';

export default function PageHeader({
  systemTag = 'AEROTWIN // SYS',
  title,
  description,
  actions,
  className = 'pb-4 mb-5',
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-800/80 ${className}`}>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800/90 text-sky-400 border border-slate-700/80 tracking-wider">
            {systemTag}
          </span>
        </div>
        <h1 className="text-lg md:text-xl font-bold font-mono text-slate-100 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-3xl leading-relaxed">
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
