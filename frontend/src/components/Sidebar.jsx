import React from 'react';
import { NavLink } from 'react-router-dom';
import AeroTwinLogo from './AeroTwinLogo';
import {
  LayoutDashboard,
  Plane,
  Activity,
  Box,
  PlayCircle,
  BrainCircuit,
  Sliders,
  ShieldCheck,
  Wrench,
  FileText,
  Radio,
  Navigation,
  X,
} from 'lucide-react';

const NAVIGATION_SECTIONS = [
  {
    category: 'OVERVIEW',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Fleet Overview', path: '/fleet', icon: Plane },
      { name: 'UAV Tracking', path: '/uav-tracking', icon: Navigation },
    ],
  },
  {
    category: 'ENGINE & DIGITAL TWIN',
    items: [
      { name: 'Real-Time Monitoring', path: '/monitoring', icon: Activity },
      { name: '3D Digital Twin', path: '/digital-twin', icon: Box },
      { name: 'Engine Simulator', path: '/simulation', icon: PlayCircle },
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
    category: 'MISSION & RELIABILITY',
    items: [
      { name: 'Mission Risk Engine', path: '/mission', icon: ShieldCheck },
      { name: 'Predictive Maintenance', path: '/maintenance', icon: Wrench },
    ],
  },
  {
    category: 'INTELLIGENCE',
    items: [
      { name: 'Telemetry Reports', path: '/reports', icon: FileText },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 bg-[#090d16] border-r border-slate-800/80 flex flex-col transition-transform duration-150 ease-in-out lg:translate-x-0 lg:static select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Area */}
        <div className="h-16 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#070b13]">
          <div className="flex items-center gap-2.5 min-w-0">
            <AeroTwinLogo size={42} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold font-mono text-white tracking-wider truncate">
                AEROTWIN<span className="text-sky-400 font-extrabold">-UAV</span>
              </div>
              <p className="text-[10px] font-mono font-semibold text-slate-300 tracking-wider leading-none mt-1">
                DEFENCE MONITORING
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {NAVIGATION_SECTIONS.map((section) => (
            <div key={section.category}>
              <div className="px-2.5 mb-1.5 text-[9px] font-mono font-bold tracking-widest text-slate-400 uppercase">
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
                          `flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                            isActive
                              ? 'bg-slate-800/90 text-sky-300 border-l-2 border-sky-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
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
        <div className="p-3 border-t border-slate-800/80 bg-[#070b12]">
          <div className="px-2.5 py-1.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>SYSTEM: ONLINE</span>
            </span>
            <span className="text-slate-400">OPS-C2</span>
          </div>
        </div>
      </aside>
    </>
  );
}
