import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Box,
  PlayCircle,
  BrainCircuit,
  Sliders,
  ShieldCheck,
  Wrench,
  FileText,
  Radio,
  X,
} from 'lucide-react';

const NAVIGATION_SECTIONS = [
  {
    category: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    category: 'ENGINE',
    items: [
      { name: 'Real-Time Monitoring', path: '/monitoring', icon: Activity },
      { name: 'Digital Twin', path: '/digital-twin', icon: Box },
      { name: 'Simulation', path: '/simulation', icon: PlayCircle },
    ],
  },
  {
    category: 'AI & PREDICTION',
    items: [
      { name: 'AI Analysis', path: '/ai-analysis', icon: BrainCircuit },
      { name: 'What-If Simulator', path: '/what-if', icon: Sliders },
    ],
  },
  {
    category: 'MISSION',
    items: [
      { name: 'Mission Reliability', path: '/mission', icon: ShieldCheck },
      { name: 'Predictive Maintenance', path: '/maintenance', icon: Wrench },
    ],
  },
  {
    category: 'REPORTS',
    items: [
      { name: 'Reports', path: '/reports', icon: FileText },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-bold font-mono text-slate-100 tracking-wider">
                AEROTWIN<span className="text-sky-400">-UAV</span>
              </span>
              <p className="text-[10px] font-mono text-slate-400 tracking-tight leading-none mt-0.5">
                MALE TWIN OPS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.category}>
              <div className="px-3 mb-1.5 text-[10px] font-mono font-semibold tracking-wider text-slate-400">
                {section.category}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onClose?.();
                          }
                        }}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 px-3 py-2 rounded text-xs font-mono transition-colors ${
                            isActive
                              ? 'bg-sky-500/15 text-sky-300 border-l-2 border-sky-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-slate-200" />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* System telemetry footer tag */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className="px-2 py-1.5 rounded bg-slate-900/70 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>LINK: STANDBY</span>
            </span>
            <span className="text-slate-400">v0.1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
