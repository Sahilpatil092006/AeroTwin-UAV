import React from 'react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import TelemetryCard from '../components/TelemetryCard';
import SectionCard from '../components/SectionCard';
import HealthIndicator from '../components/HealthIndicator';
import RiskBadge from '../components/RiskBadge';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { WS_STATUS } from '../hooks/useWebSocket';
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  AlertTriangle,
  Zap,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    isConnected,
    status,
    packet,
    telemetry,
    digitalTwin,
    ai,
    mission,
    history,
  } = useTelemetry();

  // 1. Connection Indicator Styling
  let connBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
  let connLabel = 'DISCONNECTED';
  if (isConnected) {
    connBadgeClass = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
    connLabel = 'CONNECTED';
  } else if (status === WS_STATUS.CONNECTING || status === WS_STATUS.RECONNECTING) {
    connBadgeClass = 'bg-amber-950/70 text-amber-400 border-amber-800/80';
    connLabel = status === WS_STATUS.RECONNECTING ? 'RECONNECTING...' : 'CONNECTING...';
  }

  // 2. Engine Health Metrics Calculation
  const healthVal = isConnected && digitalTwin?.engine_health !== undefined
    ? Math.round(digitalTwin.engine_health * 10) / 10
    : null;
  const healthStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : healthVal >= 80
      ? STATUS_TYPES.HEALTHY
      : healthVal >= 60
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  const fitnessVal = isConnected && digitalTwin?.engine_fitness_score !== undefined
    ? Math.round(digitalTwin.engine_fitness_score * 10) / 10
    : null;
  const fitnessStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : fitnessVal >= 80
      ? STATUS_TYPES.HEALTHY
      : STATUS_TYPES.WARNING;

  const riskLevel = isConnected && mission?.mission_risk ? mission.mission_risk : 'UNKNOWN';
  const riskStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : riskLevel === 'LOW'
      ? STATUS_TYPES.HEALTHY
      : riskLevel === 'MEDIUM'
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  const rulVal = isConnected && ai?.predicted_rul_hours !== undefined
    ? ai.predicted_rul_hours
    : '--';
  const rulStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : typeof rulVal === 'number' && rulVal > 100
      ? STATUS_TYPES.HEALTHY
      : STATUS_TYPES.WARNING;

  // 5. Digital Twin State
  const overallTwinStatus = digitalTwin?.overall_status || 'NOMINAL';
  const twinStateStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : ['OPTIMAL', 'NOMINAL', 'HEALTHY'].includes(overallTwinStatus)
      ? STATUS_TYPES.HEALTHY
      : overallTwinStatus === 'DEGRADED' || overallTwinStatus === 'WARNING'
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  const deviations = digitalTwin?.deviations || {};
  const expectedTel = digitalTwin?.expected_telemetry || {};

  // 6. AI Inference Status
  const faultProbability = isConnected && ai?.predicted_fault && ai?.fault_probabilities?.[ai.predicted_fault] !== undefined
    ? Math.round(ai.fault_probabilities[ai.predicted_fault] * 100)
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Connection State */}
      <PageHeader
        systemTag="UAV-PROPULSION // COCKPIT"
        title="Mission Control Dashboard"
        description="Real-time health telemetry, physical engine state estimation, and mission reliability overview for MALE UAV aero piston propulsion."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">TELEMETRY LINK:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${connBadgeClass}`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 animate-pulse'
                    : status === WS_STATUS.CONNECTING || status === WS_STATUS.RECONNECTING
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                }`}
              />
              {connLabel}
            </span>
          </div>
        }
      />

      {/* 2. ENGINE HEALTH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HealthIndicator
          label="Engine Health"
          value={healthVal}
          status={healthStatus}
          subtext={isConnected ? `State: ${overallTwinStatus}` : 'Awaiting telemetry stream'}
        />
        <HealthIndicator
          label="Engine Fitness Score"
          value={fitnessVal}
          status={fitnessStatus}
          subtext={isConnected ? 'Physics residual baseline tracked' : 'Physical degradation baseline standby'}
        />
        <MetricCard
          title="Mission Risk"
          value={riskLevel}
          unit=""
          status={riskStatus}
          subtext={isConnected && mission?.mission_recommendation ? mission.mission_recommendation.replace(/_/g, ' ') : 'Awaiting mission profile input'}
          icon={ShieldAlert}
        />
        <MetricCard
          title="Remaining Useful Life (RUL)"
          value={rulVal}
          unit="hrs"
          status={rulStatus}
          subtext={isConnected ? 'AI degradation estimation' : 'Degradation model standby'}
          icon={Clock}
        />
      </div>

      {/* 3. PROPULSION TELEMETRY (8 Channels) */}
      <SectionCard
        title="Propulsion Telemetry Channels"
        subtitle="Monitored piston engine sensors with nominal operational thresholds"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <TelemetryCard
            label="Engine Speed"
            code="RPM"
            value={isConnected && telemetry?.rpm !== undefined ? telemetry.rpm : '--'}
            unit="RPM"
            nominalRange="2000 - 2700"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.rpm >= 2000 && telemetry.rpm <= 2700 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Cylinder Head Temp"
            code="CHT"
            value={isConnected && telemetry?.cht !== undefined ? telemetry.cht : '--'}
            unit="°C"
            nominalRange="80 - 130"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.cht <= 130 ? STATUS_TYPES.HEALTHY : telemetry.cht <= 145 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL)}
          />
          <TelemetryCard
            label="Exhaust Gas Temp"
            code="EGT"
            value={isConnected && telemetry?.egt !== undefined ? telemetry.egt : '--'}
            unit="°C"
            nominalRange="700 - 850"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.egt >= 680 && telemetry.egt <= 850 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Oil Lubrication Press"
            code="OIL_P"
            value={isConnected && telemetry?.oil_pressure !== undefined ? telemetry.oil_pressure : '--'}
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.oil_pressure >= 2.0 && telemetry.oil_pressure <= 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
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
            label="Chassis Vibration"
            code="VIB"
            value={isConnected && telemetry?.vibration !== undefined ? telemetry.vibration : '--'}
            unit="g"
            nominalRange="< 5.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.vibration < 5.0 ? STATUS_TYPES.HEALTHY : telemetry.vibration < 8.0 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL)}
          />
          <TelemetryCard
            label="Fuel Flow Rate"
            code="FF"
            value={isConnected && telemetry?.fuel_flow !== undefined ? telemetry.fuel_flow : '--'}
            unit="L/h"
            nominalRange="15.0 - 38.0"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.fuel_flow >= 15.0 && telemetry.fuel_flow <= 38.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Engine Load"
            code="LOAD"
            value={isConnected && telemetry?.engine_load !== undefined ? telemetry.engine_load : '--'}
            unit="%"
            nominalRange="40 - 85"
            status={!isConnected || !telemetry ? STATUS_TYPES.IDLE : (telemetry.engine_load <= 85 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
        </div>
      </SectionCard>

      {/* 4. LIVE TELEMETRY CHART */}
      <SectionCard
        title="Live Telemetry Stream"
        subtitle="High-frequency parameter tracking across rotational and thermal envelopes"
      >
        <TelemetryStreamChart
          title="Multi-Channel Telemetry Stream"
          data={history}
          height={260}
          emptyMessage={isConnected ? 'Buffering telemetry stream...' : 'Waiting for real-time telemetry...'}
        />
      </SectionCard>

      {/* 5, 6, 7. OPERATIONAL TRIPLE-PANEL: DIGITAL TWIN, AI STATUS, MISSION STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 5. DIGITAL TWIN STATUS */}
        <SectionCard
          title="Digital Twin Status"
          subtitle="Physical expectations vs simulated telemetry & residuals"
          action={
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              !isConnected
                ? 'bg-slate-900 text-slate-500 border-slate-800'
                : ['OPTIMAL', 'NOMINAL', 'HEALTHY'].includes(overallTwinStatus)
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                  : overallTwinStatus === 'DEGRADED'
                    ? 'bg-amber-950/60 text-amber-400 border-amber-800/80'
                    : 'bg-rose-950/60 text-rose-400 border-rose-800/80'
            }`}>
              {isConnected ? overallTwinStatus : 'STANDBY'}
            </span>
          }
        >
          <div className="space-y-2.5 font-mono text-xs">
            <div className="text-[11px] text-slate-400 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span>PARAMETER</span>
              <span>ACTUAL / EXPECTED</span>
              <span>DEVIATION</span>
            </div>

            {[
              { code: 'RPM', actual: telemetry?.rpm, expected: expectedTel?.rpm, dev: deviations?.rpm },
              { code: 'CHT', actual: telemetry?.cht, expected: expectedTel?.cht, dev: deviations?.cht, unit: '°C' },
              { code: 'EGT', actual: telemetry?.egt, expected: expectedTel?.egt, dev: deviations?.egt, unit: '°C' },
              { code: 'OIL_P', actual: telemetry?.oil_pressure, expected: expectedTel?.oil_pressure, dev: deviations?.oil_pressure, unit: 'bar' },
            ].map((p) => {
              const actStr = isConnected && p.actual !== undefined ? p.actual : '--';
              const expStr = isConnected && p.expected !== undefined ? p.expected : '--';
              const devVal = isConnected && p.dev?.absolute_deviation !== undefined
                ? Math.abs(p.dev.absolute_deviation).toFixed(1)
                : '--';
              const devStatus = p.dev?.status || 'NORMAL';
              const devColor = !isConnected
                ? 'text-slate-500'
                : devStatus === 'CRITICAL'
                  ? 'text-rose-400'
                  : devStatus === 'WARNING'
                    ? 'text-amber-400'
                    : 'text-emerald-400';

              return (
                <div key={p.code} className="flex items-center justify-between text-[11px] py-0.5">
                  <span className="font-semibold text-slate-300">{p.code}</span>
                  <span className="text-slate-400">
                    {actStr} <span className="text-slate-600">/</span> {expStr}
                  </span>
                  <span className={`font-semibold ${devColor}`}>
                    Δ {devVal} {p.unit || ''}
                  </span>
                </div>
              );
            })}

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
              <span>TWIN ID: {isConnected ? packet?.engine_id || 'ENGINE-001' : 'NONE'}</span>
              <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>
                {isConnected ? 'TRACKING ACTIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 6. AI STATUS */}
        <SectionCard
          title="AI Diagnostics & Anomaly"
          subtitle="Classifier inference, Isolation Forest anomaly, and RUL"
          action={
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              isConnected
                ? 'bg-sky-950/60 text-sky-400 border-sky-800/80'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}>
              {isConnected ? 'INFERENCE ACTIVE' : 'STANDBY'}
            </span>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            {/* Primary Fault */}
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[10px]">PREDICTED FAULT CLASS</span>
                <span className="text-[10px] text-slate-400">
                  CONFIDENCE: {faultProbability !== null ? `${faultProbability}%` : '--'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && ai?.predicted_fault && ai.predicted_fault !== 'NORMAL' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className={`font-bold ${
                  !isConnected
                    ? 'text-slate-500'
                    : ai?.predicted_fault === 'NORMAL'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                }`}>
                  {isConnected ? ai?.predicted_fault || 'NORMAL' : 'STANDBY'}
                </span>
              </div>
            </div>

            {/* Anomaly & RUL Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">ANOMALY STATUS</span>
                <span className={`font-bold block ${
                  !isConnected
                    ? 'text-slate-500'
                    : ai?.anomaly_status === 'NORMAL'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                }`}>
                  {isConnected ? ai?.anomaly_status || 'NORMAL' : 'STANDBY'}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  SCORE: {isConnected && ai?.anomaly_score !== undefined ? ai.anomaly_score.toFixed(4) : '--'}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">PREDICTED RUL</span>
                <span className="font-bold text-slate-200 block">
                  {isConnected && ai?.predicted_rul_hours !== undefined ? `${ai.predicted_rul_hours} hrs` : '--'}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  RF REGRESSOR
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-800/60 pt-1.5">
              <span>CYCLE: REAL-TIME</span>
              <span>MODELS: RANDOM FOREST + IFOREST</span>
            </div>
          </div>
        </SectionCard>

        {/* 7. MISSION STATUS */}
        <SectionCard
          title="Mission Risk & Advisory"
          subtitle="Real-time multi-factor decision engine evaluation"
          action={<RiskBadge level={riskLevel} />}
        >
          <div className="space-y-2.5 font-mono text-xs">
            {/* Reliability Rating */}
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[10px]">MISSION RELIABILITY SCORE</span>
                <span className="font-bold text-slate-200">
                  {isConnected && mission?.mission_reliability_score !== undefined ? `${mission.mission_reliability_score}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    !isConnected
                      ? 'bg-slate-700 w-0'
                      : (mission?.mission_reliability_score ?? 0) >= 80
                        ? 'bg-emerald-500'
                        : (mission?.mission_reliability_score ?? 0) >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                  }`}
                  style={{ width: isConnected ? `${mission?.mission_reliability_score || 0}%` : '0%' }}
                />
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">AUTONOMOUS RECOMMENDATION</span>
              <span className={`font-bold ${
                !isConnected
                  ? 'text-slate-500'
                  : mission?.mission_recommendation === 'CONTINUE_MISSION'
                    ? 'text-emerald-400'
                    : mission?.mission_recommendation === 'PROCEED_WITH_CAUTION'
                      ? 'text-amber-400'
                      : 'text-rose-400'
              }`}>
                {isConnected && mission?.mission_recommendation ? mission.mission_recommendation.replace(/_/g, ' ') : 'STANDBY'}
              </span>
            </div>

            {/* Reason Codes */}
            <div className="text-[10px]">
              <span className="text-slate-400 block mb-1">EVALUATION REASON CODES:</span>
              {isConnected && mission?.reason_codes?.length ? (
                <div className="flex flex-wrap gap-1">
                  {mission.reason_codes.map((rc, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[9px]">
                      {rc}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">
                  {isConnected ? 'Nominal flight envelope. No risk escalation flags.' : 'Awaiting telemetry link.'}
                </span>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
