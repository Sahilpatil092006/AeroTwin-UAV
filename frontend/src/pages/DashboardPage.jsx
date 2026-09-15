import React from 'react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import TelemetryCard from '../components/TelemetryCard';
import StatusCard from '../components/StatusCard';
import SectionCard from '../components/SectionCard';
import HealthIndicator from '../components/HealthIndicator';
import RiskBadge from '../components/RiskBadge';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { Activity, ShieldAlert, Cpu, CheckCircle2, Clock } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        systemTag="UAV-PROPULSION // COCKPIT"
        title="Mission Control Dashboard"
        description="Real-time health telemetry, physical engine state estimation, and mission reliability overview for MALE UAV aero piston propulsion."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">TELEMETRY LINK:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              DISCONNECTED (AWAITING SIM)
            </span>
          </div>
        }
      />

      {/* Top High-Level Health, Fitness, Risk, RUL Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HealthIndicator
          label="Engine Health"
          value={null}
          status={STATUS_TYPES.IDLE}
          subtext="Awaiting telemetry stream"
        />
        <HealthIndicator
          label="Engine Fitness Score"
          value={null}
          status={STATUS_TYPES.IDLE}
          subtext="Physical degradation baseline standby"
        />
        <MetricCard
          title="Mission Risk"
          value="UNKNOWN"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Awaiting mission profile input"
          icon={ShieldAlert}
        />
        <MetricCard
          title="Remaining Useful Life (RUL)"
          value="--"
          unit="hrs"
          status={STATUS_TYPES.IDLE}
          subtext="Degradation model standby"
          icon={Clock}
        />
      </div>

      {/* Engine Telemetry Channels Grid (RPM, CHT, EGT, Oil Pressure, Vibration, Fuel Flow) */}
      <SectionCard
        title="Propulsion Telemetry Channels"
        subtitle="Monitored piston engine sensors with nominal operational thresholds"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <TelemetryCard
            label="Engine Speed"
            code="RPM"
            value="--"
            unit="RPM"
            nominalRange="2000 - 5800"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Cylinder Head Temp"
            code="CHT"
            value="--"
            unit="°C"
            nominalRange="90 - 135"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Exhaust Gas Temp"
            code="EGT"
            value="--"
            unit="°C"
            nominalRange="700 - 880"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Oil Lubrication Press"
            code="OIL_P"
            value="--"
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Chassis Vibration"
            code="VIB"
            value="--"
            unit="mm/s"
            nominalRange="< 15.0"
            status={STATUS_TYPES.IDLE}
          />
          <TelemetryCard
            label="Fuel Flow Rate"
            code="FF"
            value="--"
            unit="L/h"
            nominalRange="12.0 - 32.0"
            status={STATUS_TYPES.IDLE}
          />
        </div>
      </SectionCard>

      {/* Real-Time Telemetry Chart */}
      <SectionCard
        title="Live Telemetry Stream"
        subtitle="High-frequency telemetry parameter tracking and digital twin variance analysis"
      >
        <TelemetryStreamChart
          title="Multi-Channel Telemetry Stream"
          data={[]}
          height={260}
          emptyMessage="Waiting for real-time telemetry..."
        />
      </SectionCard>

      {/* Bottom Row: Engine Status, Active Faults, Mission Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Engine Status */}
        <StatusCard
          title="Engine Status"
          status={STATUS_TYPES.IDLE}
          details="Engine offline. Waiting for simulation ignition sequence."
          icon={Activity}
        />

        {/* Active Faults */}
        <SectionCard
          title="Active Faults"
          subtitle="Real-time multi-class diagnostic alarms"
        >
          <div className="h-full flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-mono text-slate-400">
              No active fault alerts registered.
            </p>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              ANOMALY CLASSIFIER: STANDBY
            </span>
          </div>
        </SectionCard>

        {/* Mission Recommendation */}
        <SectionCard
          title="Mission Recommendation"
          subtitle="AI-synthesized operational advisory"
          action={<RiskBadge level="UNKNOWN" />}
        >
          <div className="flex flex-col justify-between h-full py-2">
            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <p className="text-xs font-mono text-slate-400 leading-relaxed">
                Waiting for mission profile and engine telemetry stream. Flight risk evaluation will synthesize upon simulation telemetry broadcast.
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>ABORT ADVISORY: NONE</span>
              <span>CONFIDENCE: --</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
