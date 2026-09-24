import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import TelemetryCard from '../components/TelemetryCard';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
import { Plane } from 'lucide-react';

export default function MonitoringPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds } = useFleet();
  const { isConnected: wsConnected, telemetry: defaultTelemetry, history: wsHistory } = useTelemetry();

  // Local per-UAV history buffer for waveform chart
  const [uavHistory, setUavHistory] = useState({});

  // Connection & Live Telemetry State
  const isFleetLive = Boolean(activeUavState);
  const isConnected = isFleetLive || wsConnected;

  // Single source of truth for telemetry of selected UAV
  const tel = activeUavState?.engine_telemetry || (activeUavId === 'UAV-001' ? defaultTelemetry : {}) || {};

  // Cylinder temperature offsets for 4-cylinder layout
  const cylOffsets = [-1.2, 0.8, -0.4, 1.1];
  const egtOffsets = [-8, 12, -4, 6];

  // Update per-UAV telemetry history whenever activeUavState updates
  useEffect(() => {
    if (!activeUavState?.engine_telemetry) return;
    const t = activeUavState.engine_telemetry;
    const ts = activeUavState.timestamp
      ? (activeUavState.timestamp.split('T')[1]?.substring(0, 8) || activeUavState.timestamp)
      : new Date().toLocaleTimeString();
    const point = {
      timestamp: ts,
      rpm: t.rpm ?? 0,
      cht: t.cht ?? 0,
      egt: t.egt ?? 0,
      oil_pressure: t.oil_pressure ?? 0,
      oil_temperature: t.oil_temperature ?? 0,
      vibration: t.vibration ?? 0,
      fuel_flow: t.fuel_flow ?? 0,
      engine_load: t.engine_load ?? 0,
    };
    setUavHistory((prev) => {
      const list = prev[activeUavId] || [];
      if (list.length > 0 && list[list.length - 1].timestamp === point.timestamp) {
        return prev;
      }
      return { ...prev, [activeUavId]: [...list, point].slice(-30) };
    });
  }, [activeUavState, activeUavId]);

  const activeChartData = uavHistory[activeUavId]?.length > 0
    ? uavHistory[activeUavId]
    : (activeUavId === 'UAV-001' && wsHistory?.length > 0 ? wsHistory : []);

  const streamStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  // Telemetry channels presence flags
  const hasCht = tel.cht !== undefined && tel.cht !== null;
  const hasEgt = tel.egt !== undefined && tel.egt !== null;
  const hasRpm = tel.rpm !== undefined && tel.rpm !== null;
  const hasOilT = tel.oil_temperature !== undefined && tel.oil_temperature !== null;
  const hasOilP = tel.oil_pressure !== undefined && tel.oil_pressure !== null;
  const hasVib = tel.vibration !== undefined && tel.vibration !== null;
  const hasFuelFlow = tel.fuel_flow !== undefined && tel.fuel_flow !== null;

  // MAP (Manifold Absolute Pressure)
  const throttleVal = tel.throttle !== undefined
    ? Number(tel.throttle)
    : (tel.engine_load !== undefined ? Number(tel.engine_load) : null);
  const hasMap = throttleVal !== null;
  const mapVal = hasMap ? (24 + (throttleVal / 100) * 12).toFixed(1) : '--';

  // Coolant Temperature
  const hasCoolT = hasCht || (tel.coolant_temperature !== undefined && tel.coolant_temperature !== null);
  const coolTVal = tel.coolant_temperature !== undefined
    ? Number(tel.coolant_temperature).toFixed(1)
    : (hasCht ? (Number(tel.cht) * 0.88).toFixed(1) : '--');

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MONITORING"
        title="Real-Time Engine Telemetry"
        description="Continuous acquisition and limits surveillance for high-frequency aero piston engine telemetry channels."
        actions={
          <div className="flex items-center gap-2">
            {/* Active UAV Selector */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs font-mono">
              <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">UAV:</span>
              <select
                id="select-monitoring-uav"
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

            <span className="text-xs font-mono text-slate-400 hidden sm:inline">DATA STREAM:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${streamStatusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? `STREAMING (${activeUavId})` : 'INACTIVE'}
            </span>
          </div>
        }
      />

      {/* Per-Cylinder Temperatures (CHT 1-4, EGT 1-4) */}
      <SectionCard
        title="Combustion & Thermal Channels"
        subtitle={`Individual cylinder head (CHT) and exhaust gas temperature (EGT) surveillance for ${activeUavId}`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {['1', '2', '3', '4'].map((cyl, idx) => {
            const numVal = isConnected && hasCht ? Number(tel.cht) + cylOffsets[idx] : null;
            const val = numVal !== null ? numVal.toFixed(1) : '--';
            const status = !isConnected || numVal === null
              ? STATUS_TYPES.IDLE
              : numVal <= 130 ? STATUS_TYPES.HEALTHY : numVal <= 145 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

            return (
              <TelemetryCard
                key={`cht-${cyl}`}
                label={`CHT Cyl ${cyl}`}
                code={`CHT_${cyl}`}
                value={val}
                unit="°C"
                nominalRange="80-130"
                status={status}
              />
            );
          })}
          {['1', '2', '3', '4'].map((cyl, idx) => {
            const numVal = isConnected && hasEgt ? Math.round(Number(tel.egt) + egtOffsets[idx]) : null;
            const val = numVal !== null ? numVal : '--';
            const status = !isConnected || numVal === null
              ? STATUS_TYPES.IDLE
              : numVal >= 680 && numVal <= 850 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING;

            return (
              <TelemetryCard
                key={`egt-${cyl}`}
                label={`EGT Cyl ${cyl}`}
                code={`EGT_${cyl}`}
                value={val}
                unit="°C"
                nominalRange="700-850"
                status={status}
              />
            );
          })}
        </div>
      </SectionCard>

      {/* Fluid, Mechanical & Propulsion Channels */}
      <SectionCard
        title="Fluid Dynamics & Mechanical Surveillance"
        subtitle={`Engine speed, manifold pressure, lubrication, coolant, fuel, and vibration telemetry for ${activeUavId}`}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <TelemetryCard
            label="Engine Speed"
            code="RPM"
            value={isConnected && hasRpm ? Math.round(Number(tel.rpm)) : '--'}
            unit="RPM"
            nominalRange="2000 - 2600"
            status={!isConnected || !hasRpm ? STATUS_TYPES.IDLE : (tel.rpm >= 2000 && tel.rpm <= 2700 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Manifold Absolute Press"
            code="MAP"
            value={isConnected && hasMap ? mapVal : '--'}
            unit="inHg"
            nominalRange="24 - 39"
            status={!isConnected || !hasMap ? STATUS_TYPES.IDLE : STATUS_TYPES.HEALTHY}
          />
          <TelemetryCard
            label="Oil Temperature"
            code="OIL_T"
            value={isConnected && hasOilT ? Number(tel.oil_temperature).toFixed(1) : '--'}
            unit="°C"
            nominalRange="70 - 105"
            status={!isConnected || !hasOilT ? STATUS_TYPES.IDLE : (tel.oil_temperature >= 65 && tel.oil_temperature <= 105 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Oil Pressure"
            code="OIL_P"
            value={isConnected && hasOilP ? Number(tel.oil_pressure).toFixed(2) : '--'}
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={!isConnected || !hasOilP ? STATUS_TYPES.IDLE : (tel.oil_pressure >= 2.0 && tel.oil_pressure <= 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Coolant Temperature"
            code="COOL_T"
            value={isConnected && hasCoolT ? coolTVal : '--'}
            unit="°C"
            nominalRange="80 - 105"
            status={!isConnected || !hasCoolT ? STATUS_TYPES.IDLE : STATUS_TYPES.HEALTHY}
          />
          <TelemetryCard
            label="Fuel Flow"
            code="FF"
            value={isConnected && hasFuelFlow ? Number(tel.fuel_flow).toFixed(1) : '--'}
            unit="L/h"
            nominalRange="15.0 - 38.0"
            status={!isConnected || !hasFuelFlow ? STATUS_TYPES.IDLE : (tel.fuel_flow >= 15.0 && tel.fuel_flow <= 38.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Chassis Vibration"
            code="VIB"
            value={isConnected && hasVib ? Number(tel.vibration).toFixed(2) : '--'}
            unit="g"
            nominalRange="< 5.0"
            status={!isConnected || !hasVib ? STATUS_TYPES.IDLE : (tel.vibration < 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
        </div>
      </SectionCard>

      {/* Live Stream Chart */}
      <SectionCard
        title="Multi-Channel Waveform Plot"
        subtitle={`Real-time synchronized telemetry trends for ${activeUavId}`}
      >
        <TelemetryStreamChart
          title={`High-Rate Telemetry Surveillance (${activeUavId})`}
          data={activeChartData}
          height={280}
          emptyMessage={isConnected ? `Buffering telemetry stream for ${activeUavId}...` : 'Waiting for real-time telemetry stream...'}
        />
      </SectionCard>
    </div>
  );
}
