import React from 'react';
import { Menu, Activity, Shield, User, Gauge } from 'lucide-react';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';

export default function TopBar({ onMenuClick }) {
  const sysStatusCfg = getStatusConfig(STATUS_TYPES.IDLE);
  const simStatusCfg = getStatusConfig(STATUS_TYPES.IDLE);

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left side: Hamburger (on mobile) & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-900 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold font-mono text-slate-100 tracking-wider">
              AeroTwin-UAV
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/50">
              MISSION CONTROL
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 hidden md:block">
            Aero Piston Engine Digital Twin
          </p>
        </div>
      </div>

      {/* Right side: Status Indicators & Operator Area */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* System Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-[11px] font-mono leading-none">
            <span className="text-slate-400 block text-[9px]">SYSTEM</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${sysStatusCfg.dotColor}`} />
              <span className={`font-semibold ${sysStatusCfg.textColor}`}>
                {sysStatusCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Current Simulation Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-[11px] font-mono leading-none">
            <span className="text-slate-400 block text-[9px]">SIM ENGINE</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${simStatusCfg.dotColor}`} />
              <span className="font-semibold text-slate-300">IDLE</span>
            </div>
          </div>
        </div>

        {/* User / Operator Area */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left font-mono leading-tight">
            <span className="text-xs font-semibold text-slate-200 block">
              OPERATOR 01
            </span>
            <span className="text-[10px] text-slate-400">GROUND STATION</span>
          </div>
        </div>
      </div>
    </header>
  );
}
