import React from 'react';
import { Menu, Activity, Radio, User, Gauge, Plane } from 'lucide-react';
import AeroTwinLogo from './AeroTwinLogo';
import { getStatusConfig, STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
import { WS_STATUS } from '../hooks/useWebSocket';

export default function TopBar({ onMenuClick }) {
  const { isConnected, status, packet } = useTelemetry();
  const { activeUavId, setActiveUavId, fleetUavIds, activeUavState } = useFleet();

  let sysStatusCfg;
  let sysLabel;
  if (isConnected) {
    sysStatusCfg = getStatusConfig(STATUS_TYPES.HEALTHY);
    sysLabel = 'ONLINE';
  } else if (status === WS_STATUS.CONNECTING || status === WS_STATUS.RECONNECTING) {
    sysStatusCfg = getStatusConfig(STATUS_TYPES.WARNING);
    sysLabel = status === WS_STATUS.RECONNECTING ? 'RECONNECT' : 'CONNECTING';
  } else {
    sysStatusCfg = getStatusConfig(STATUS_TYPES.IDLE);
    sysLabel = 'OFFLINE';
  }

  // PHASE: always read from the active UAV's fleet state — never from the raw
  // WebSocket packet, which reflects whichever UAV last broadcast, not the
  // currently selected one.
  const flightPhase =
    activeUavState?.flight_phase ||
    activeUavState?.engine_telemetry?.flight_phase ||
    (packet?.flight_phase) ||
    'STANDBY';

  return (
    <header className="h-14 bg-[#0c121e]/95 border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Left: Hamburger (mobile) & Brand Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <AeroTwinLogo size={26} className="hidden sm:block" />
          <span className="text-sm font-bold font-mono text-slate-100 tracking-wider">
            AEROTWIN<span className="text-sky-400">-UAV</span>
          </span>
          <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 tracking-wider">
            DEFENCE C2
          </span>
          <span className="hidden lg:inline text-xs font-mono text-slate-400 border-l border-slate-800 pl-2.5">
            Aero Piston Engine Digital Twin
          </span>
        </div>
      </div>

      {/* Right: Operational Status Indicators & Operator Badge */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Active UAV Selector */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs font-mono">
          <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider">ACTIVE:</span>
            <select
              value={activeUavId}
              onChange={(e) => setActiveUavId(e.target.value)}
              className="bg-transparent text-slate-100 font-bold font-mono focus:outline-none cursor-pointer text-xs pr-1"
              aria-label="Select Active UAV"
            >
              {fleetUavIds.map((id) => (
                <option key={id} value={id} className="bg-slate-900 text-slate-100">
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Telemetry Link Status */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <div className="leading-none">
            <span className="text-slate-500 block text-[9px]">LINK</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className={`font-semibold ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* System Phase */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800 text-[11px] font-mono">
          <Gauge className="w-3.5 h-3.5 text-slate-400" />
          <div className="leading-none">
            <span className="text-slate-500 block text-[9px]">PHASE</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-slate-200">{flightPhase}</span>
            </div>
          </div>
        </div>

        {/* Operator Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden xl:block text-left font-mono leading-tight">
            <span className="text-xs font-medium text-slate-200 block">OPERATOR 01</span>
            <span className="text-[9px] text-slate-500">GROUND STATION</span>
          </div>
        </div>
      </div>
    </header>
  );
}
