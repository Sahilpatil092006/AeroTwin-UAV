import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import TelemetryCard from '../components/TelemetryCard';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { Activity, Radio, Filter } from 'lucide-react';

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MONITORING"
        title="Real-Time Engine Telemetry"
        description="Continuous acquisition and limits surveillance for high-frequency aero piston engine telemetry channels."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">DATA STREAM:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              INACTIVE
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
          {['1', '2', '3', '4'].map((cyl) => (
            <TelemetryCard
              key={`cht-${cyl}`}
              label={`CHT Cyl ${cyl}`}
              code={`CHT_${cyl}`}
              value="--"
              unit="°C"
              nominalRange="90-135"
              status={STATUS_TYPES.IDLE}
            />
          ))}
          {['1', '2', '3', '4'].map((cyl) => (
            <TelemetryCard
              key={`egt-${cyl}`}
              label={`EGT Cyl ${cyl}`}
              code={`EGT_${cyl}`}
              value="--"
              unit="°C"
              nominalRange="700-880"
              status={STATUS_TYPES.IDLE}
            />
          ))}
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
            value="--"
            unit="inHg"
            nominalRange="24 - 39"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Oil Temperature"
            code="OIL_T"
            value="--"
            unit="°C"
            nominalRange="70 - 110"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Oil Pressure"
            code="OIL_P"
            value="--"
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Coolant Temperature"
            code="COOL_T"
            value="--"
            unit="°C"
            nominalRange="80 - 105"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Fuel Pressure"
            code="FUEL_P"
            value="--"
            unit="bar"
            nominalRange="2.8 - 3.2"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Generator DC Bus"
            code="V_BUS"
            value="--"
            unit="V"
            nominalRange="26.0 - 28.5"
            status={STATUS_TYPES.IDLE}
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
          data={[]}
          height={280}
          emptyMessage="Waiting for real-time telemetry stream..."
        />
      </SectionCard>
    </div>
  );
}
