import React from 'react';

export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}) {
  return (
    <div className={`rounded-lg bg-[#0e1422]/90 border border-slate-800/80 flex flex-col shadow-sm backdrop-blur-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80">
          <div>
            {title && (
              <h3 className="text-xs md:text-sm font-semibold font-mono text-slate-100 tracking-wide uppercase">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
