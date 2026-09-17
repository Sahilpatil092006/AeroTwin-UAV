import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import EngineViewerPlaceholder from '../engine3d/EngineViewerPlaceholder';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';

export default function DigitalTwinPage() {
  const { isConnected, packet, telemetry, digitalTwin } = useTelemetry();

  const syncStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  const deviations = digitalTwin?.deviations || {};

  const rpmDev = isConnected && deviations.rpm?.absolute_deviation !== undefined
    ? Math.abs(deviations.rpm.absolute_deviation).toFixed(1)
    : '--';
  const chtDev = isConnected && deviations.cht?.absolute_deviation !== undefined
    ? Math.abs(deviations.cht.absolute_deviation).toFixed(1)
    : '--';
  const oilDev = isConnected && deviations.oil_pressure?.absolute_deviation !== undefined
    ? Math.abs(deviations.oil_pressure.absolute_deviation).toFixed(2)
    : '--';
  const egtDev = isConnected && deviations.egt?.absolute_deviation !== undefined
    ? Math.abs(deviations.egt.absolute_deviation).toFixed(1)
    : '--';

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // DIGITAL TWIN"
        title="3D Engine Digital Twin"
        description="Physics-informed virtual replica of the aero piston engine. Synchronizes real-time telemetry against nominal thermodynamic baselines."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">TWIN SYNCHRONIZATION:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${syncStatusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'SYNCHRONIZED (LIVE)' : 'STANDBY'}
            </span>
          </div>
        }
      />

      {/* 3D Model Canvas Viewport */}
      <SectionCard
        title="Interactive 3D Virtual Engine Representation"
        subtitle="Three.js / React Three Fiber interactive viewport with thermal overlay mapping"
      >
        <EngineViewerPlaceholder height={380} />
      </SectionCard>

      {/* Subsystems & Physics Residuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subsystem State Matrix */}
        <SectionCard
          title="Engine Subsystem State Tracking"
          subtitle="Monitored structural and functional components"
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              {
                name: 'Cylinders 1 & 2 (Left Bank)',
                temp: isConnected && telemetry?.cht ? `${telemetry.cht} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Cylinders 3 & 4 (Right Bank)',
                temp: isConnected && telemetry?.cht ? `${(telemetry.cht + 0.8).toFixed(1)} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Turbocharger & Exhaust Manifold',
                temp: isConnected && telemetry?.egt ? `${telemetry.egt} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Dual Electronic Ignition (CDI)',
                temp: isConnected && telemetry?.rpm ? `${telemetry.rpm} RPM` : '--',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Lubrication & Scavenge Pump',
                temp: isConnected && telemetry?.oil_pressure ? `${telemetry.oil_pressure} bar` : '-- bar',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
            ].map((subsystem, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{subsystem.name}</span>
                  <span className="text-[10px] text-slate-400">STATE / PARAM: {subsystem.temp}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] border ${
                  isConnected
                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {subsystem.status}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Physics-Telemetry Residual Analysis */}
        <SectionCard
          title="Digital Twin Residuals (Observed vs Model)"
          subtitle="Variance between physics baseline model and synthetic sensor stream"
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard
              title="RPM Residual (ΔRPM)"
              value={rpmDev}
              unit="RPM"
              status={!isConnected ? STATUS_TYPES.IDLE : deviations.rpm?.status === 'CRITICAL' ? STATUS_TYPES.CRITICAL : deviations.rpm?.status === 'WARNING' ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY}
              subtext="Tolerance: ±25 RPM"
            />
            <MetricCard
              title="Thermal Residual (ΔCHT)"
              value={chtDev}
              unit="°C"
              status={!isConnected ? STATUS_TYPES.IDLE : deviations.cht?.status === 'CRITICAL' ? STATUS_TYPES.CRITICAL : deviations.cht?.status === 'WARNING' ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY}
              subtext="Tolerance: ±4.0 °C"
            />
            <MetricCard
              title="Lubrication Residual (ΔOIL_P)"
              value={oilDev}
              unit="bar"
              status={!isConnected ? STATUS_TYPES.IDLE : deviations.oil_pressure?.status === 'CRITICAL' ? STATUS_TYPES.CRITICAL : deviations.oil_pressure?.status === 'WARNING' ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY}
              subtext="Tolerance: ±0.3 bar"
            />
            <MetricCard
              title="Exhaust Residual (ΔEGT)"
              value={egtDev}
              unit="°C"
              status={!isConnected ? STATUS_TYPES.IDLE : deviations.egt?.status === 'CRITICAL' ? STATUS_TYPES.CRITICAL : deviations.egt?.status === 'WARNING' ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY}
              subtext="Tolerance: ±12.0 °C"
            />
          </div>

          <div className="p-3 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-400">
            {isConnected && digitalTwin
              ? `Digital Twin active for ${packet?.engine_id || 'ENGINE-001'} // Health: ${digitalTwin.engine_health}% // Fitness: ${digitalTwin.engine_fitness_score}% // Status: ${digitalTwin.overall_status}`
              : 'Awaiting active digital twin state synchronization link.'}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
