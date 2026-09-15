import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatusCard from '../components/StatusCard';
import { STATUS_TYPES } from '../utils/status';
import { Play, Square, RotateCcw, Sliders, AlertTriangle, Layers } from 'lucide-react';

export default function SimulationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // SIMULATION"
        title="Mission & Engine Simulation"
        description="Software-in-the-loop numerical simulation engine generating flight profiles, dynamic thermodynamic engine cycles, and synthetic telemetry."
        actions={
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-not-allowed opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START SIMULATION</span>
            </button>
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60"
            >
              <Square className="w-3.5 h-3.5" />
              <span>STOP</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Simulation State"
          status={STATUS_TYPES.IDLE}
          details="Engine physics model standby. Awaiting mission parameter configuration."
          icon={Sliders}
        />
        <StatusCard
          title="Flight Profile Link"
          status={STATUS_TYPES.IDLE}
          details="Altitude: 0 ft // Throttle: 0% // Airspeed: 0 kts"
          icon={Layers}
        />
        <StatusCard
          title="Fault Injection System"
          status={STATUS_TYPES.IDLE}
          details="All failure injection channels disabled (Nominal Mode)."
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission Flight Profile Parameters */}
        <SectionCard
          title="Mission Flight Profile Configuration"
          subtitle="Define operational environmental and throttle conditions"
        >
          <div className="space-y-4 font-mono text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">TARGET ALTITUDE</span>
                <span className="text-base font-bold text-slate-100">-- ft</span>
                <p className="text-[10px] text-slate-400 mt-1">Operational ceiling: 25,000 ft</p>
              </div>

              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">THROTTLE LEVER ANGLE (TLA)</span>
                <span className="text-base font-bold text-slate-100">-- %</span>
                <p className="text-[10px] text-slate-400 mt-1">Full Authority Digital Engine Control</p>
              </div>

              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">INDICATED AIRSPEED (IAS)</span>
                <span className="text-base font-bold text-slate-100">-- kts</span>
                <p className="text-[10px] text-slate-400 mt-1">Nominal loiter: 75 - 90 kts</p>
              </div>

              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 block mb-1">AMBIENT TEMPERATURE & PRESSURE</span>
                <span className="text-base font-bold text-slate-100">-- ISA</span>
                <p className="text-[10px] text-slate-400 mt-1">International Standard Atmosphere</p>
              </div>
            </div>

            <div className="p-4 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center">
              <p className="text-slate-400">
                Simulation parameter controls will connect to the backend simulation engine in Step 3.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Fault Injection Modes */}
        <SectionCard
          title="Fault Injection Scenarios"
          subtitle="Inject synthetic component degradation modes into the telemetry stream"
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              { id: 'FLT-01', name: 'Fuel Injector Clogging / Partial Lean', severity: 'WARNING' },
              { id: 'FLT-02', name: 'Cylinder Exhaust Valve Leakage', severity: 'CRITICAL' },
              { id: 'FLT-03', name: 'Coolant Radiator Fouling / Thermal Degradation', severity: 'WARNING' },
              { id: 'FLT-04', name: 'Oil Scavenge Pump Loss / Pressure Drop', severity: 'CRITICAL' },
              { id: 'FLT-05', name: 'Turbocharger Wastegate Actuator Stiction', severity: 'WARNING' },
            ].map((fault) => (
              <div
                key={fault.id}
                className="flex items-center justify-between p-3 rounded bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {fault.id}
                    </span>
                    <span className="font-semibold text-slate-200">{fault.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    TARGET COMPONENT: PISTON / PROPULSION SUBSYSTEM
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  ARMED: OFF
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
