import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import AeroPistonEngine3D from '../engine3d/AeroPistonEngine3D';
import AeroPistonEngine2D from '../engine3d/AeroPistonEngine2D';
import ComponentInfoPanel from '../engine3d/ComponentInfoPanel';
import PartsListTable from '../engine3d/PartsListTable';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import {
  Box,
  FileCode2,
  ListOrdered,
  Cpu,
  Activity,
  Gauge,
  Thermometer,
  Zap,
  Droplet,
  Waves,
  Flame,
  Fuel,
  TrendingUp,
  Percent
} from 'lucide-react';

export default function DigitalTwinPage() {
  const { isConnected, packet, telemetry, digitalTwin } = useTelemetry();
  const [activeTab, setActiveTab] = useState('3D VIEW');
  const [selectedPartId, setSelectedPartId] = useState('cylinder_head');
  const [selectedCylinder, setSelectedCylinder] = useState('CYLINDER 1');

  const syncStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  const deviations = digitalTwin?.deviations || {};

  const rpmDev =
    isConnected && deviations.rpm?.absolute_deviation !== undefined
      ? Math.abs(deviations.rpm.absolute_deviation).toFixed(1)
      : '--';
  const chtDev =
    isConnected && deviations.cht?.absolute_deviation !== undefined
      ? Math.abs(deviations.cht.absolute_deviation).toFixed(1)
      : '--';
  const oilDev =
    isConnected && deviations.oil_pressure?.absolute_deviation !== undefined
      ? Math.abs(deviations.oil_pressure.absolute_deviation).toFixed(2)
      : '--';
  const egtDev =
    isConnected && deviations.egt?.absolute_deviation !== undefined
      ? Math.abs(deviations.egt.absolute_deviation).toFixed(1)
      : '--';

  // Live telemetry channel extractions
  const rpmVal = isConnected && telemetry?.rpm ? Number(telemetry.rpm).toFixed(1) : '--';
  const chtVal = isConnected && telemetry?.cht ? Number(telemetry.cht).toFixed(1) : '--';
  const egtVal = isConnected && telemetry?.egt ? Number(telemetry.egt).toFixed(1) : '--';
  const oilPVal = isConnected && telemetry?.oil_pressure ? Number(telemetry.oil_pressure).toFixed(2) : '--';
  const oilTVal = isConnected && telemetry?.oil_temperature ? Number(telemetry.oil_temperature).toFixed(1) : '--';
  const vibVal = isConnected && telemetry?.vibration ? Number(telemetry.vibration).toFixed(2) : '--';
  const fuelVal = isConnected && telemetry?.fuel_flow ? Number(telemetry.fuel_flow).toFixed(1) : '--';
  const loadVal = isConnected && telemetry?.engine_load ? Number(telemetry.engine_load).toFixed(1) : '--';

  return (
    <div className="space-y-6 select-none font-mono">
      <PageHeader
        systemTag="AEROTWIN // DIGITAL TWIN"
        title="3D Aero Piston Engine Digital Twin"
        description="Physics-informed virtual replica of the 4-cylinder turbocharged aero piston propulsion system. Synchronizes real-time telemetry against nominal thermodynamic baselines."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('3D VIEW')}
                className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === '3D VIEW'
                    ? 'bg-sky-950 border border-sky-500 text-sky-200 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-sky-400" />
                <span>3D VIEW</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('2D SCHEMATIC')}
                className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === '2D SCHEMATIC'
                    ? 'bg-sky-950 border border-sky-500 text-sky-200 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
                <span>2D SCHEMATIC</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('PARTS LIST')}
                className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'PARTS LIST'
                    ? 'bg-sky-950 border border-sky-500 text-sky-200 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5 text-sky-400" />
                <span>PARTS LIST</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ENGINE INFO')}
                className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 transition-all ${
                  activeTab === 'ENGINE INFO'
                    ? 'bg-sky-950 border border-sky-500 text-sky-200 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>ENGINE INFO</span>
              </button>
            </div>

            {/* Twin Synchronization Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">SYNCHRONIZATION:</span>
              <span
                className={`px-2.5 py-1 rounded text-xs font-semibold border flex items-center gap-1.5 ${syncStatusClass}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {isConnected ? 'SYNCHRONIZED (LIVE)' : 'STANDBY'}
              </span>
            </div>
          </div>
        }
      />

      {/* Main Grid: Left Live Telemetry Rail + Central Engine Visualization Viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Rail: Live Telemetry Channels */}
        <div className="xl:col-span-1 space-y-3">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                LIVE TELEMETRY
              </span>
              <span className="text-[10px] text-emerald-400">10 Hz STREAM</span>
            </div>

            {/* RPM */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">ENGINE SPEED</span>
                  <span className="text-xs font-bold text-slate-100">{rpmVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-sky-400 font-bold">RPM</span>
            </div>

            {/* CHT */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">CYLINDER HEAD (CHT)</span>
                  <span className="text-xs font-bold text-slate-100">{chtVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-bold">°C</span>
            </div>

            {/* EGT */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">EXHAUST GAS (EGT)</span>
                  <span className="text-xs font-bold text-slate-100">{egtVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-orange-400 font-bold">°C</span>
            </div>

            {/* Oil Pressure */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-3.5 h-3.5 text-yellow-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">OIL PRESSURE</span>
                  <span className="text-xs font-bold text-slate-100">{oilPVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-yellow-400 font-bold">bar</span>
            </div>

            {/* Oil Temperature */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-yellow-500" />
                <div>
                  <span className="text-[10px] text-slate-400 block">OIL TEMPERATURE</span>
                  <span className="text-xs font-bold text-slate-100">{oilTVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-yellow-500 font-bold">°C</span>
            </div>

            {/* Vibration */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-3.5 h-3.5 text-purple-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">VIBRATION</span>
                  <span className="text-xs font-bold text-slate-100">{vibVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-purple-400 font-bold">g</span>
            </div>

            {/* Fuel Flow */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel className="w-3.5 h-3.5 text-rose-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">FUEL CONSUMPTION</span>
                  <span className="text-xs font-bold text-slate-100">{fuelVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-rose-400 font-bold">L/h</span>
            </div>

            {/* Engine Load */}
            <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">ENGINE LOAD</span>
                  <span className="text-xs font-bold text-slate-100">{loadVal}</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">%</span>
            </div>

            {/* Twin Health & RUL Index */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500 block">HEALTH INDEX</span>
                <span className="font-bold text-emerald-400">
                  {digitalTwin?.engine_health !== undefined
                    ? `${Number(digitalTwin.engine_health).toFixed(1)}%`
                    : '--'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">PREDICTED RUL</span>
                <span className="font-bold text-sky-300">
                  {digitalTwin?.predicted_rul_hours !== undefined
                    ? `${Number(digitalTwin.predicted_rul_hours).toFixed(0)} hrs`
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right: Primary Visualization Viewport */}
        <div className="xl:col-span-3">
          {activeTab === '3D VIEW' && (
            <SectionCard
              title="Interactive 3D Virtual Engine Representation"
              subtitle="Rotax 914/915 iS Turbocharged 4-Cylinder Boxer Aero Engine • Click parts to inspect"
            >
              <AeroPistonEngine3D
                selectedPartId={selectedPartId}
                onSelectPart={setSelectedPartId}
                selectedCylinder={selectedCylinder}
                onSelectCylinder={setSelectedCylinder}
                telemetry={telemetry}
                digitalTwin={digitalTwin}
                isConnected={isConnected}
                height={540}
              />
            </SectionCard>
          )}

          {activeTab === '2D SCHEMATIC' && (
            <SectionCard
              title="Orthographic 2D Technical Schematic Diagram"
              subtitle="Vector blueprint representation of Boxer-4 aero piston engine • Click parts to inspect"
            >
              <AeroPistonEngine2D
                selectedPartId={selectedPartId}
                onSelectPart={setSelectedPartId}
                selectedCylinder={selectedCylinder}
                onSelectCylinder={setSelectedCylinder}
                telemetry={telemetry}
                digitalTwin={digitalTwin}
                isConnected={isConnected}
                height={540}
              />
            </SectionCard>
          )}

          {activeTab === 'PARTS LIST' && (
            <PartsListTable
              selectedPartId={selectedPartId}
              onSelectPart={setSelectedPartId}
              telemetry={telemetry}
              digitalTwin={digitalTwin}
              isConnected={isConnected}
            />
          )}

          {activeTab === 'ENGINE INFO' && (
            <ComponentInfoPanel
              selectedPartId={selectedPartId}
              onSelectPart={setSelectedPartId}
              telemetry={telemetry}
              digitalTwin={digitalTwin}
              isConnected={isConnected}
            />
          )}
        </div>
      </div>

      {/* Component Information Panel (always visible when viewing 3D or 2D) */}
      {(activeTab === '3D VIEW' || activeTab === '2D SCHEMATIC') && (
        <ComponentInfoPanel
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          telemetry={telemetry}
          digitalTwin={digitalTwin}
          isConnected={isConnected}
        />
      )}

      {/* Parts List Table (visible below 3D & 2D views) */}
      {(activeTab === '3D VIEW' || activeTab === '2D SCHEMATIC') && (
        <PartsListTable
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          telemetry={telemetry}
          digitalTwin={digitalTwin}
          isConnected={isConnected}
        />
      )}

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
                temp:
                  isConnected && telemetry?.cht
                    ? `${(Number(telemetry.cht) + 0.8).toFixed(1)} °C`
                    : '-- °C',
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
                temp:
                  isConnected && telemetry?.oil_pressure
                    ? `${telemetry.oil_pressure} bar`
                    : '-- bar',
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
                <span
                  className={`px-2 py-0.5 rounded text-[10px] border ${
                    isConnected
                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
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
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : deviations.rpm?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : deviations.rpm?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±25 RPM"
            />
            <MetricCard
              title="Thermal Residual (ΔCHT)"
              value={chtDev}
              unit="°C"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : deviations.cht?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : deviations.cht?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±4.0 °C"
            />
            <MetricCard
              title="Lubrication Residual (ΔOIL_P)"
              value={oilDev}
              unit="bar"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : deviations.oil_pressure?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : deviations.oil_pressure?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±0.3 bar"
            />
            <MetricCard
              title="Exhaust Residual (ΔEGT)"
              value={egtDev}
              unit="°C"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : deviations.egt?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : deviations.egt?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±12.0 °C"
            />
          </div>

          <div className="p-3 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-400">
            {isConnected && digitalTwin
              ? `Digital Twin active for ${
                  packet?.engine_id || 'ENGINE-001'
                } // Health: ${digitalTwin.engine_health}% // Fitness: ${
                  digitalTwin.engine_fitness_score
                }% // Status: ${digitalTwin.overall_status}`
              : 'Awaiting active digital twin state synchronization link.'}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
