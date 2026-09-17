import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import TelemetryCard from '../components/TelemetryCard';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';

export default function MonitoringPage() {
  const { isConnected, telemetry, history } = useTelemetry();

  // Cylinder temperature offsets for 4-cylinder layout
  const cylOffsets = [-1.2, 0.8, -0.4, 1.1];
  const egtOffsets = [-8, 12, -4, 6];

  const streamStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MONITORING"
        title="Real-Time Engine Telemetry"
        description="Continuous acquisition and limits surveillance for high-frequency aero piston engine telemetry channels."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">DATA STREAM:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${streamStatusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'STREAMING (LIVE)' : 'INACTIVE'}
            </span>
          </div>
        }
      />

      {/* Per-Cylinder Temperatures (CHT 1-4, EGT 1-4) */}
      <SectionCard
        title="Combustion & Thermal Channels"
        subtitle="Individual cylinder head (CHT) and exhaust gas temperature (EGT) surveillance"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {['1', '2', '3', '4'].map((cyl, idx) => {
            const val = isConnected && telemetry?.cht !== undefined
              ? (telemetry.cht + cylOffsets[idx]).toFixed(1)
              : '--';
            const status = !isConnected
              ? STATUS_TYPES.IDLE
              : val <= 130 ? STATUS_TYPES.HEALTHY : val <= 145 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

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
            const val = isConnected && telemetry?.egt !== undefined
              ? Math.round(telemetry.egt + egtOffsets[idx])
              : '--';
            const status = !isConnected
              ? STATUS_TYPES.IDLE
              : val >= 680 && val <= 850 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING;

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

      {/* Fluid & Mechanical Channels */}
      <SectionCard
        title="Fluid Dynamics & Mechanical Surveillance"
        subtitle="Manifold pressure, lubrication, coolant, electrical, and vibration telemetry"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <TelemetryCard
            label="Manifold Absolute Press"
            code="MAP"
            value={isConnected && telemetry?.throttle !== undefined ? (24 + (telemetry.throttle / 100) * 12).toFixed(1) : '--'}
            unit="inHg"
            nominalRange="24 - 39"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : STATUS_TYPES.HEALTHY}
          />
          <TelemetryCard
            label="Oil Temperature"
            code="OIL_T"
            value={isConnected && telemetry?.oil_temperature !== undefined ? telemetry.oil_temperature : '--'}
            unit="°C"
            nominalRange="70 - 105"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.oil_temperature >= 65 && telemetry.oil_temperature <= 105 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Oil Pressure"
            code="OIL_P"
            value={isConnected && telemetry?.oil_pressure !== undefined ? telemetry.oil_pressure : '--'}
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.oil_pressure >= 2.0 && telemetry.oil_pressure <= 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Coolant Temperature"
            code="COOL_T"
            value={isConnected && telemetry?.cht !== undefined ? (telemetry.cht * 0.88).toFixed(1) : '--'}
            unit="°C"
            nominalRange="80 - 105"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : STATUS_TYPES.HEALTHY}
          />
          <TelemetryCard
            label="Fuel Flow"
            code="FF"
            value={isConnected && telemetry?.fuel_flow !== undefined ? telemetry.fuel_flow : '--'}
            unit="L/h"
            nominalRange="15.0 - 38.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.fuel_flow >= 15.0 && telemetry.fuel_flow <= 38.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Chassis Vibration"
            code="VIB"
            value={isConnected && telemetry?.vibration !== undefined ? telemetry.vibration : '--'}
            unit="g"
            nominalRange="< 5.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.vibration < 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
        </div>
      </SectionCard>

      {/* Live Stream Chart */}
      <SectionCard
        title="Multi-Channel Waveform Plot"
        subtitle="Real-time synchronized telemetry trends"
      >
        <TelemetryStreamChart
          title="High-Rate Telemetry Surveillance"
          data={history}
          height={280}
          emptyMessage={isConnected ? 'Buffering telemetry stream...' : 'Waiting for real-time telemetry stream...'}
        />
      </SectionCard>
    </div>
  );
}
