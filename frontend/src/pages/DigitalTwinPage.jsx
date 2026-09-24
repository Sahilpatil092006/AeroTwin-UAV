import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import AeroPistonEngine3D from '../engine3d/AeroPistonEngine3D';
import AeroPistonEngine2D from '../engine3d/AeroPistonEngine2D';
import ComponentInfoPanel from '../engine3d/ComponentInfoPanel';
import PartsListTable from '../engine3d/PartsListTable';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
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
  Percent,
  Plane,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// Expected nominal physics baselines for digital twin deviations
const PARAM_BASELINES = {
  rpm: 2400.0,
  cht: 105.0,
  egt: 800.0,
  oil_pressure: 2.8,
};

export default function DigitalTwinPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds } = useFleet();
  const {
    isConnected: wsConnected,
    telemetry: defaultTelemetry,
    digitalTwin: defaultTwin,
    ai: defaultAi,
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState('3D VIEW');
  const [selectedPartId, setSelectedPartId] = useState(null);
  const [selectedCylinder, setSelectedCylinder] = useState('CYLINDER 1');

  // ── Reset 3D visualization state whenever the active UAV changes ──────────────────
  // This ensures no stale fault highlight / selected-part from a previous UAV
  // bleeds into the newly selected UAV's 3D view.
  useEffect(() => {
    setSelectedPartId(null);
    setSelectedCylinder('CYLINDER 1');
  }, [activeUavId]);

  // Single Source of Truth: Active UAV State
  const isFleetLive = Boolean(activeUavState);
  const isConnected = isFleetLive || wsConnected;

  // 1. Synchronized Telemetry for Active UAV
  const rawTel = activeUavState?.engine_telemetry || (activeUavId === 'UAV-001' ? defaultTelemetry : {}) || {};
  const activeTelemetry = {
    ...rawTel,
    flight_phase: activeUavState?.flight_phase || rawTel.flight_phase || (activeUavId === 'UAV-001' ? defaultTelemetry?.flight_phase : 'CRUISE') || 'CRUISE',
  };

  const rpmNum = activeTelemetry.rpm !== undefined ? Number(activeTelemetry.rpm) : null;
  const chtNum = activeTelemetry.cht !== undefined ? Number(activeTelemetry.cht) : null;
  const egtNum = activeTelemetry.egt !== undefined ? Number(activeTelemetry.egt) : null;
  const oilPNum = activeTelemetry.oil_pressure !== undefined ? Number(activeTelemetry.oil_pressure) : null;
  const oilTNum = activeTelemetry.oil_temperature !== undefined ? Number(activeTelemetry.oil_temperature) : null;
  const vibNum = activeTelemetry.vibration !== undefined ? Number(activeTelemetry.vibration) : null;
  const fuelNum = activeTelemetry.fuel_flow !== undefined ? Number(activeTelemetry.fuel_flow) : null;
  const loadNum = activeTelemetry.engine_load !== undefined ? Number(activeTelemetry.engine_load) : null;
  const flightPhase = activeTelemetry.flight_phase || 'CRUISE';

  const rpmVal = rpmNum !== null ? rpmNum.toFixed(1) : '--';
  const chtVal = chtNum !== null ? chtNum.toFixed(1) : '--';
  const egtVal = egtNum !== null ? egtNum.toFixed(1) : '--';
  const oilPVal = oilPNum !== null ? oilPNum.toFixed(2) : '--';
  const oilTVal = oilTNum !== null ? oilTNum.toFixed(1) : '--';
  const vibVal = vibNum !== null ? vibNum.toFixed(2) : '--';
  const fuelVal = fuelNum !== null ? fuelNum.toFixed(1) : '--';
  const loadVal = loadNum !== null ? loadNum.toFixed(1) : '--';

  // 2. Synchronized Health, RUL & Digital Twin Deviations
  const activeHealth = activeUavState?.engine_health !== undefined
    ? Number(activeUavState.engine_health)
    : (activeUavId === 'UAV-001' && defaultTwin?.engine_health !== undefined ? Number(defaultTwin.engine_health) : 100);

  const activeFitness = activeUavState?.fitness_score !== undefined
    ? Number(activeUavState.fitness_score)
    : (activeUavId === 'UAV-001' && defaultTwin?.engine_fitness_score !== undefined ? Number(defaultTwin.engine_fitness_score) : 100);

  const rawRul = activeUavState?.predicted_rul ?? activeUavState?.predicted_rul_hours;
  const activeRulHours = rawRul !== undefined && rawRul !== null
    ? Number(rawRul)
    : (activeUavId === 'UAV-001' && defaultAi?.predicted_rul_hours !== undefined ? Number(defaultAi.predicted_rul_hours) : 500);

  // Dynamic deviations from active UAV sensor values
  const rpmDelta = rpmNum !== null ? rpmNum - PARAM_BASELINES.rpm : 0;
  const chtDelta = chtNum !== null ? chtNum - PARAM_BASELINES.cht : 0;
  const egtDelta = egtNum !== null ? egtNum - PARAM_BASELINES.egt : 0;
  const oilPDelta = oilPNum !== null ? oilPNum - PARAM_BASELINES.oil_pressure : 0;

  const activeDeviations = {
    rpm: {
      absolute_deviation: rpmDelta,
      status: Math.abs(rpmDelta) > 250 ? 'CRITICAL' : Math.abs(rpmDelta) > 100 ? 'WARNING' : 'NORMAL',
    },
    cht: {
      absolute_deviation: chtDelta,
      status: Math.abs(chtDelta) > 15 ? 'CRITICAL' : Math.abs(chtDelta) > 8 ? 'WARNING' : 'NORMAL',
    },
    egt: {
      absolute_deviation: egtDelta,
      status: Math.abs(egtDelta) > 60 ? 'CRITICAL' : Math.abs(egtDelta) > 30 ? 'WARNING' : 'NORMAL',
    },
    oil_pressure: {
      absolute_deviation: oilPDelta,
      status: Math.abs(oilPDelta) > 0.6 ? 'CRITICAL' : Math.abs(oilPDelta) > 0.3 ? 'WARNING' : 'NORMAL',
    },
  };

  const activeOverallTwinStatus = activeHealth >= 80 ? 'OPTIMAL' : activeHealth >= 60 ? 'DEGRADED' : 'CRITICAL';

  const activeDigitalTwin = {
    engine_health: activeHealth,
    engine_fitness_score: activeFitness,
    predicted_rul_hours: activeRulHours,
    overall_status: activeOverallTwinStatus,
    expected_telemetry: PARAM_BASELINES,
    deviations: activeDeviations,
  };

  // 3. Synchronized AI & Fault State
  const activeFault = activeUavState?.fault_type || activeUavState?.predicted_fault || (activeUavId === 'UAV-001' ? defaultAi?.predicted_fault : 'NORMAL') || 'NORMAL';
  const rawConf = activeUavState?.fault_confidence !== undefined
    ? Number(activeUavState.fault_confidence)
    : (activeUavId === 'UAV-001' && defaultAi?.confidence !== undefined ? Number(defaultAi.confidence) : 0.9);

  const activeAi = {
    fault_type: activeFault,
    predicted_fault: activeFault,
    severity: activeUavState?.severity || (activeFault === 'NORMAL' ? 'NOMINAL' : 'MEDIUM'),
    affected_component: activeUavState?.affected_component || null,
    status: activeUavState?.status || (activeFault === 'NORMAL' ? 'NORMAL' : 'FAULT'),
    confidence: rawConf,
    anomaly_status: (activeUavState?.anomaly_status || (activeUavId === 'UAV-001' ? defaultAi?.anomaly_status : 'NORMAL') || 'NORMAL').toUpperCase(),
    anomaly_score: activeUavState?.anomaly_score !== undefined
      ? Number(activeUavState.anomaly_score)
      : (activeUavId === 'UAV-001' && defaultAi?.anomaly_score !== undefined ? Number(defaultAi.anomaly_score) : 0.05),
    predicted_rul_hours: activeRulHours,
    fault_probabilities: {
      [activeFault]: rawConf,
    },
  };

  const missionRisk = (activeUavState?.mission_risk || 'LOW').toUpperCase();

  // Status badges
  const syncStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  let twinBadge = {
    label: activeFault === 'NORMAL' ? 'NOMINAL PHYSICAL STATE' : `${activeFault.replace(/_/g, ' ')} DETECTED`,
    badgeClass: activeFault === 'NORMAL'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : missionRisk === 'HIGH' || activeHealth < 60
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    dotClass: activeFault === 'NORMAL'
      ? 'bg-emerald-400'
      : missionRisk === 'HIGH' || activeHealth < 60
        ? 'bg-rose-400 animate-pulse'
        : 'bg-amber-400 animate-pulse',
  };

  return (
    <div className="space-y-6 select-none font-mono">
      {/* Top Page Header */}
      <PageHeader
        systemTag={`${activeUavId} // DIGITAL TWIN`}
        title="3D Aero Piston Engine Digital Twin"
        description={`Physics-informed virtual replica of the 4-cylinder turbocharged aero piston propulsion system for ${activeUavId}. Synchronizes real-time telemetry and 3D fault highlights.`}
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

      {/* Persistent Active UAV Context Header */}
      <div className="bg-[#0e1422]/95 border border-slate-700/80 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
              3D DIGITAL TWIN
            </div>
            <div className="text-base md:text-lg font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <span>SHOWING DATA FOR:</span>
              <span className="text-sky-400 font-black">
                {activeUavId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-2.5 py-1 rounded bg-slate-800/80 text-slate-300 border border-slate-700 font-mono text-xs font-semibold">
            PHASE: {flightPhase}
          </span>
          <span className={`px-2.5 py-1 rounded font-mono text-xs font-semibold border ${twinBadge.badgeClass}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${twinBadge.dotClass}`} />
            {twinBadge.label}
          </span>
          <div className="flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80">
            <span className="text-xs font-mono text-slate-400">SWITCH UAV:</span>
            <select
              value={activeUavId}
              onChange={(e) => setActiveUavId(e.target.value)}
              className="bg-transparent text-slate-100 font-mono text-xs font-bold focus:outline-none cursor-pointer"
            >
              {(fleetUavIds || ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005']).map((id) => (
                <option key={id} value={id} className="bg-slate-900 text-slate-100">
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Live Telemetry Rail + Central Engine Visualization Viewport */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Rail: Live Telemetry Channels for Selected UAV */}
        <div className="xl:col-span-1 space-y-3">
          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                {activeUavId} TELEMETRY
              </span>
              <span className="text-[10px] text-emerald-400">SYNCHRONIZED</span>
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
                <span className={`font-bold ${activeHealth < 60 ? 'text-rose-400' : activeHealth < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {activeHealth.toFixed(1)}%
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">PREDICTED RUL</span>
                <span className="font-bold text-sky-300">
                  {activeRulHours.toFixed(0)} hrs
                </span>
              </div>
            </div>

            {/* Fault & Risk State */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500 block">PREDICTED FAULT</span>
                <span className={`font-bold ${activeFault === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {activeFault.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">MISSION RISK</span>
                <span className={`font-bold ${missionRisk === 'HIGH' ? 'text-rose-400' : missionRisk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {missionRisk}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right: Primary Visualization Viewport */}
        <div className="xl:col-span-3">
          {activeTab === '3D VIEW' && (
            <SectionCard
              title={`3D DIGITAL TWIN — SHOWING DATA FOR: ${activeUavId}`}
              subtitle={`Rotax 914/915 iS Virtual Physical Engine • Unit: ${activeUavId} • Fault State: ${activeFault.replace(/_/g, ' ')}`}
            >
              <AeroPistonEngine3D
                selectedPartId={selectedPartId}
                onSelectPart={setSelectedPartId}
                selectedCylinder={selectedCylinder}
                onSelectCylinder={setSelectedCylinder}
                onSwitchMode={setActiveTab}
                telemetry={activeTelemetry}
                digitalTwin={activeDigitalTwin}
                ai={activeAi}
                isConnected={isConnected}
                uavId={activeUavId}
                height={540}
              />
            </SectionCard>
          )}

          {activeTab === '2D SCHEMATIC' && (
            <SectionCard
              title={`2D TECHNICAL SCHEMATIC — SHOWING DATA FOR: ${activeUavId}`}
              subtitle={`Vector blueprint representation of Boxer-4 aero piston engine for ${activeUavId}`}
            >
              <AeroPistonEngine2D
                selectedPartId={selectedPartId}
                onSelectPart={setSelectedPartId}
                selectedCylinder={selectedCylinder}
                onSelectCylinder={setSelectedCylinder}
                onSwitchMode={setActiveTab}
                telemetry={activeTelemetry}
                digitalTwin={activeDigitalTwin}
                isConnected={isConnected}
                uavId={activeUavId}
                height={540}
              />
            </SectionCard>
          )}

          {activeTab === 'PARTS LIST' && (
            <PartsListTable
              selectedPartId={selectedPartId}
              onSelectPart={setSelectedPartId}
              telemetry={activeTelemetry}
              digitalTwin={activeDigitalTwin}
              isConnected={isConnected}
            />
          )}

          {activeTab === 'ENGINE INFO' && (
            <ComponentInfoPanel
              selectedPartId={selectedPartId}
              onSelectPart={setSelectedPartId}
              telemetry={activeTelemetry}
              digitalTwin={activeDigitalTwin}
              ai={activeAi}
              isConnected={isConnected}
            />
          )}
        </div>
      </div>

      {/* Parts List Table (visible below 3D & 2D views) */}
      {(activeTab === '3D VIEW' || activeTab === '2D SCHEMATIC') && (
        <PartsListTable
          selectedPartId={selectedPartId}
          onSelectPart={setSelectedPartId}
          telemetry={activeTelemetry}
          digitalTwin={activeDigitalTwin}
          isConnected={isConnected}
        />
      )}

      {/* Subsystems & Physics Residuals for Active UAV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subsystem State Matrix */}
        <SectionCard
          title={`Engine Subsystem State Tracking (${activeUavId})`}
          subtitle={`Monitored structural and functional components for ${activeUavId}`}
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              {
                name: 'Cylinders 1 & 2 (Left Bank)',
                temp: chtNum !== null ? `${chtNum.toFixed(1)} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Cylinders 3 & 4 (Right Bank)',
                temp: chtNum !== null ? `${(chtNum + 0.8).toFixed(1)} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Turbocharger & Exhaust Manifold',
                temp: egtNum !== null ? `${egtNum.toFixed(1)} °C` : '-- °C',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Dual Electronic Ignition (CDI)',
                temp: rpmNum !== null ? `${rpmNum.toFixed(0)} RPM` : '-- RPM',
                status: isConnected ? 'SYNCHRONIZED' : 'STANDBY',
              },
              {
                name: 'Lubrication & Scavenge Pump',
                temp: oilPNum !== null ? `${oilPNum.toFixed(2)} bar` : '-- bar',
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
          title={`Digital Twin Residuals (${activeUavId})`}
          subtitle={`Variance between baseline physical model and ${activeUavId} sensor stream`}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            <MetricCard
              title="RPM Residual (ΔRPM)"
              value={rpmNum !== null ? Math.abs(rpmDelta).toFixed(1) : '--'}
              unit="RPM"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : activeDeviations.rpm?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : activeDeviations.rpm?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±25 RPM"
            />
            <MetricCard
              title="Thermal Residual (ΔCHT)"
              value={chtNum !== null ? Math.abs(chtDelta).toFixed(1) : '--'}
              unit="°C"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : activeDeviations.cht?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : activeDeviations.cht?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±4.0 °C"
            />
            <MetricCard
              title="Lubrication Residual (ΔOIL_P)"
              value={oilPNum !== null ? Math.abs(oilPDelta).toFixed(2) : '--'}
              unit="bar"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : activeDeviations.oil_pressure?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : activeDeviations.oil_pressure?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±0.3 bar"
            />
            <MetricCard
              title="Exhaust Residual (ΔEGT)"
              value={egtNum !== null ? Math.abs(egtDelta).toFixed(1) : '--'}
              unit="°C"
              status={
                !isConnected
                  ? STATUS_TYPES.IDLE
                  : activeDeviations.egt?.status === 'CRITICAL'
                  ? STATUS_TYPES.CRITICAL
                  : activeDeviations.egt?.status === 'WARNING'
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.HEALTHY
              }
              subtext="Tolerance: ±12.0 °C"
            />
          </div>

          <div className="p-3 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs font-mono text-slate-400">
            {isConnected
              ? `Digital Twin active for ${activeUavId} // Health: ${activeHealth.toFixed(1)}% // Fitness: ${activeFitness.toFixed(1)}% // Status: ${activeOverallTwinStatus}`
              : 'Awaiting active digital twin state synchronization link.'}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
