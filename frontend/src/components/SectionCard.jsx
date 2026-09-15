import React from 'react';

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <div className={`rounded bg-slate-900/60 border border-slate-800 flex flex-col ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div>
            {title && (
              <h3 className="text-sm font-semibold font-mono text-slate-200 tracking-wide uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
