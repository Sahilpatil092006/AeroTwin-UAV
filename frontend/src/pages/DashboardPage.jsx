import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import MetricCard from '../components/MetricCard';
import TelemetryCard from '../components/TelemetryCard';
import SectionCard from '../components/SectionCard';
import HealthIndicator from '../components/HealthIndicator';
import RiskBadge from '../components/RiskBadge';
import TelemetryStreamChart from '../charts/TelemetryStreamChart';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
import { WS_STATUS } from '../hooks/useWebSocket';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plane,
} from 'lucide-react';

// Expected nominal physics baselines for digital twin deviations
const PARAM_BASELINES = {
  RPM: { baseline: 2400, unit: 'RPM', maxDev: 250 },
  CHT: { baseline: 105.0, unit: '°C', maxDev: 15.0 },
  EGT: { baseline: 800.0, unit: '°C', maxDev: 35.0 },
  OIL_P: { baseline: 2.8, unit: 'bar', maxDev: 0.6 },
};

export default function DashboardPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds, hasActiveUavData } = useFleet();
  const {
    isConnected: wsConnected,
    status: wsStatus,
    telemetry: defaultTelemetry,
    digitalTwin: defaultTwin,
    ai: defaultAi,
    mission: defaultMission,
    history: wsHistory,
  } = useTelemetry();

  // Local history buffer isolated per UAV
  const [uavHistory, setUavHistory] = useState({});

  // 1. Connection & Live Telemetry State
  const isFleetLive = Boolean(activeUavState);
  const isConnected = isFleetLive || wsConnected;

  let connBadgeClass = 'bg-slate-800 text-slate-400 border-slate-700';
  let connLabel = 'DISCONNECTED';
  if (isFleetLive) {
    connBadgeClass = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
    connLabel = 'FLEET SYNC ACTIVE';
  } else if (wsConnected) {
    connBadgeClass = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
    connLabel = 'CONNECTED';
  } else if (wsStatus === WS_STATUS.CONNECTING || wsStatus === WS_STATUS.RECONNECTING) {
    connBadgeClass = 'bg-amber-950/70 text-amber-400 border-amber-800/80';
    connLabel = wsStatus === WS_STATUS.RECONNECTING ? 'RECONNECTING...' : 'CONNECTING...';
  }

  // 2. Telemetry Channels Synchronized strictly with Active UAV
  const tel = activeUavState?.engine_telemetry || (activeUavId === 'UAV-001' ? defaultTelemetry : {}) || {};
  const rpm = tel.rpm;
  const cht = tel.cht;
  const egt = tel.egt;
  const oilPressure = tel.oil_pressure;
  const oilTemperature = tel.oil_temperature;
  const vibration = tel.vibration;
  const fuelFlow = tel.fuel_flow;
  const engineLoad = tel.engine_load;
  const flightPhase = activeUavState?.flight_phase || tel.flight_phase || (activeUavId === 'UAV-001' ? defaultTelemetry?.flight_phase : 'CRUISE') || 'CRUISE';

  // Update per-UAV telemetry history whenever activeUavState updates
  useEffect(() => {
    if (!activeUavState?.engine_telemetry) return;
    const t = activeUavState.engine_telemetry;
    const point = {
      timestamp: activeUavState.timestamp || new Date().toISOString(),
      rpm: t.rpm,
      cht: t.cht,
      egt: t.egt,
      oil_pressure: t.oil_pressure,
      oil_temperature: t.oil_temperature,
      vibration: t.vibration,
      fuel_flow: t.fuel_flow,
      engine_load: t.engine_load,
    };
    setUavHistory((prev) => {
      const list = prev[activeUavId] || [];
      if (list.length > 0 && list[list.length - 1].timestamp === point.timestamp) {
        return prev;
      }
      return { ...prev, [activeUavId]: [...list, point].slice(-30) };
    });
  }, [activeUavState, activeUavId]);

  // Active chart data is strictly isolated to selected UAV
  const activeChartData = uavHistory[activeUavId]?.length > 0
    ? uavHistory[activeUavId]
    : (activeUavId === 'UAV-001' && wsHistory?.length > 0 ? wsHistory : []);

  // 3. Engine Health Metrics (Single source of truth from activeUavState)
  const rawHealth = activeUavState?.engine_health !== undefined
    ? Number(activeUavState.engine_health)
    : (activeUavId === 'UAV-001' && defaultTwin?.engine_health !== undefined ? Number(defaultTwin.engine_health) : null);
  const healthVal = rawHealth !== null ? Math.round(rawHealth * 10) / 10 : null;
  const healthStatus = healthVal === null
    ? STATUS_TYPES.IDLE
    : healthVal >= 80
      ? STATUS_TYPES.HEALTHY
      : healthVal >= 60
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  // 4. Engine Fitness Score
  const rawFitness = activeUavState?.fitness_score !== undefined
    ? Number(activeUavState.fitness_score)
    : (activeUavId === 'UAV-001' && defaultTwin?.engine_fitness_score !== undefined ? Number(defaultTwin.engine_fitness_score) : null);
  const fitnessVal = rawFitness !== null ? Math.round(rawFitness * 10) / 10 : null;
  const fitnessStatus = fitnessVal === null
    ? STATUS_TYPES.IDLE
    : fitnessVal >= 80
      ? STATUS_TYPES.HEALTHY
      : STATUS_TYPES.WARNING;

  // 5. Mission Risk & Recommendation
  const riskLevel = activeUavState?.mission_risk
    ? String(activeUavState.mission_risk).toUpperCase()
    : (activeUavId === 'UAV-001' && defaultMission?.mission_risk ? String(defaultMission.mission_risk).toUpperCase() : 'UNKNOWN');
  const riskStatus = riskLevel === 'LOW'
    ? STATUS_TYPES.HEALTHY
    : riskLevel === 'MEDIUM'
      ? STATUS_TYPES.WARNING
      : riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
        ? STATUS_TYPES.CRITICAL
        : STATUS_TYPES.IDLE;

  const recommendation = activeUavState?.recommendation || (activeUavId === 'UAV-001' ? defaultMission?.mission_recommendation : 'CONTINUE_MISSION') || 'CONTINUE_MISSION';

  // 6. RUL Prediction
  const rawRul = (activeUavState?.predicted_rul ?? activeUavState?.predicted_rul_hours) !== undefined
    ? Number(activeUavState.predicted_rul ?? activeUavState.predicted_rul_hours)
    : (activeUavId === 'UAV-001' && defaultAi?.predicted_rul_hours !== undefined ? Number(defaultAi.predicted_rul_hours) : null);
  const rulVal = rawRul !== null ? Math.round(rawRul * 10) / 10 : '--';
  const rulStatus = typeof rulVal === 'number'
    ? (rulVal > 100 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)
    : STATUS_TYPES.IDLE;

  // 7. AI Diagnostics: Fault, Confidence, Anomaly
  const predictedFault = activeUavState?.predicted_fault || (activeUavId === 'UAV-001' ? defaultAi?.predicted_fault : 'NORMAL') || 'NORMAL';
  const rawConf = activeUavState?.fault_confidence !== undefined
    ? Number(activeUavState.fault_confidence)
    : (activeUavId === 'UAV-001' && defaultAi?.confidence !== undefined ? Number(defaultAi.confidence) : null);
  const faultProbability = rawConf !== null
    ? Math.round(rawConf * (rawConf <= 1 ? 100 : 1))
    : null;

  const anomalyStatus = (activeUavState?.anomaly_status || (activeUavId === 'UAV-001' ? defaultAi?.anomaly_status : 'NORMAL') || 'NORMAL').toUpperCase();
  const rawAnomalyScore = activeUavState?.anomaly_score !== undefined
    ? Number(activeUavState.anomaly_score)
    : (activeUavId === 'UAV-001' && defaultAi?.anomaly_score !== undefined ? Number(defaultAi.anomaly_score) : null);
  const anomalyScore = rawAnomalyScore;

  // Digital Twin state badge
  const overallTwinStatus = healthVal === null
    ? 'STANDBY'
    : healthVal >= 80
      ? 'OPTIMAL'
      : healthVal >= 60
        ? 'DEGRADED'
        : 'CRITICAL';

  // Small overall status badge
  let overallBadge = {
    label: 'STANDBY',
    badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
    dotClass: 'bg-slate-500',
  };
  if (healthVal !== null || predictedFault) {
    if (riskLevel === 'HIGH' || (healthVal !== null && healthVal < 40) || (predictedFault && !['NORMAL', 'UNKNOWN'].includes(predictedFault) && riskLevel !== 'LOW')) {
      overallBadge = {
        label: 'FAULT',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
      };
    } else if (riskLevel === 'MEDIUM' || (healthVal !== null && healthVal < 75) || anomalyStatus === 'ANOMALOUS') {
      overallBadge = {
        label: 'WARNING',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400 animate-pulse',
      };
    } else {
      overallBadge = {
        label: 'NORMAL',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
      };
    }
  }

  // Dynamic evaluation reason codes based on active UAV fault/deviations
  const reasonCodes = [];
  if (predictedFault && predictedFault !== 'NORMAL') {
    reasonCodes.push(`${predictedFault}_FLAG`);
  }
  if (anomalyStatus === 'ANOMALOUS') {
    reasonCodes.push('ANOMALY_DETECTION_POSITIVE');
  }
  if (riskLevel === 'HIGH') {
    reasonCodes.push('RISK_THRESHOLD_EXCEEDED');
  }
  if (healthVal !== null && healthVal < 50) {
    reasonCodes.push('CRITICAL_HEALTH_DEGRADATION');
  }

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Connection State & Active Unit */}
      <PageHeader
        systemTag={`${activeUavId} // MISSION CONTROL`}
        title="Mission Control Dashboard"
        description={`Real-time health telemetry, physical engine state estimation, and mission reliability overview for ${activeUavId}.`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">TELEMETRY LINK:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${connBadgeClass}`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              {connLabel}
            </span>
          </div>
        }
      />

      {/* 2. Persistent Active UAV Context Header */}
      <div className="bg-[#0e1628]/95 border border-sky-500/40 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-sky-400 font-bold uppercase">
              ACTIVE PROPULSION CONTEXT
            </div>
            <div className="text-lg md:text-xl font-black font-mono tracking-tight text-white flex items-center gap-2 mt-0.5">
              <span className="text-slate-200">SHOWING DATA FOR:</span>
              <span className="text-sky-400 underline decoration-sky-500/50 underline-offset-4 tracking-wide font-black">
                {activeUavId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded bg-slate-800/90 text-slate-200 border border-slate-700/80 font-mono text-xs font-semibold">
            PHASE: {flightPhase}
          </span>
          <span className={`px-3 py-1 rounded font-mono text-xs font-semibold border ${overallBadge.badgeClass}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${overallBadge.dotClass}`} />
            {overallBadge.label}
          </span>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700">
            <span className="text-xs font-mono text-slate-400 font-medium">SWITCH UAV:</span>
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

      {!hasActiveUavData ? (
        <div className="bg-[#0e1628]/95 border border-sky-500/30 rounded-lg p-12 text-center my-6 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <div className="font-mono text-sm text-sky-300 font-semibold tracking-wide">
            AWAITING TELEMETRY STREAM FOR {activeUavId}...
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Synchronizing live multi-UAV digital twin propulsion telemetry
          </div>
        </div>
      ) : (
        <>
          {/* 3. ENGINE HEALTH CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HealthIndicator
          label="Engine Health"
          value={healthVal}
          status={healthStatus}
          subtext={isConnected ? `${activeUavId} State: ${overallTwinStatus}` : 'Awaiting telemetry stream'}
        />
        <HealthIndicator
          label="Engine Fitness Score"
          value={fitnessVal}
          status={fitnessStatus}
          subtext={isConnected ? `${activeUavId} Physical residual tracked` : 'Physical degradation baseline standby'}
        />
        <MetricCard
          title="Mission Risk"
          value={riskLevel}
          unit=""
          status={riskStatus}
          subtext={recommendation.replace(/_/g, ' ')}
          icon={ShieldAlert}
        />
        <MetricCard
          title="Remaining Useful Life (RUL)"
          value={rulVal}
          unit="hrs"
          status={rulStatus}
          subtext={isConnected ? `${activeUavId} AI degradation estimation` : 'Degradation model standby'}
          icon={Clock}
        />
      </div>

      {/* 4. PROPULSION TELEMETRY (8 Channels) */}
      <SectionCard
        title={`Propulsion Telemetry Channels (${activeUavId})`}
        subtitle="Monitored piston engine sensors with nominal operational thresholds"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <TelemetryCard
            label="Engine Speed"
            code="RPM"
            value={rpm !== undefined ? rpm : '--'}
            unit="RPM"
            nominalRange="2000 - 2700"
            status={rpm === undefined ? STATUS_TYPES.IDLE : (rpm >= 2000 && rpm <= 2700 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Cylinder Head Temp"
            code="CHT"
            value={cht !== undefined ? cht : '--'}
            unit="°C"
            nominalRange="80 - 130"
            status={cht === undefined ? STATUS_TYPES.IDLE : (cht <= 130 ? STATUS_TYPES.HEALTHY : cht <= 145 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL)}
          />
          <TelemetryCard
            label="Exhaust Gas Temp"
            code="EGT"
            value={egt !== undefined ? egt : '--'}
            unit="°C"
            nominalRange="700 - 850"
            status={egt === undefined ? STATUS_TYPES.IDLE : (egt >= 680 && egt <= 850 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Oil Lubrication Press"
            code="OIL_P"
            value={oilPressure !== undefined ? oilPressure : '--'}
            unit="bar"
            nominalRange="2.0 - 5.0"
            status={oilPressure === undefined ? STATUS_TYPES.IDLE : (oilPressure >= 2.0 && oilPressure <= 5.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Oil Temperature"
            code="OIL_T"
            value={oilTemperature !== undefined ? oilTemperature : '--'}
            unit="°C"
            nominalRange="70 - 105"
            status={oilTemperature === undefined ? STATUS_TYPES.IDLE : (oilTemperature >= 65 && oilTemperature <= 105 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Chassis Vibration"
            code="VIB"
            value={vibration !== undefined ? vibration : '--'}
            unit="g"
            nominalRange="< 5.0"
            status={vibration === undefined ? STATUS_TYPES.IDLE : (vibration < 5.0 ? STATUS_TYPES.HEALTHY : vibration < 8.0 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL)}
          />
          <TelemetryCard
            label="Fuel Flow Rate"
            code="FF"
            value={fuelFlow !== undefined ? fuelFlow : '--'}
            unit="L/h"
            nominalRange="15.0 - 38.0"
            status={fuelFlow === undefined ? STATUS_TYPES.IDLE : (fuelFlow >= 15.0 && fuelFlow <= 38.0 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
          <TelemetryCard
            label="Engine Load"
            code="LOAD"
            value={engineLoad !== undefined ? engineLoad : '--'}
            unit="%"
            nominalRange="40 - 85"
            status={engineLoad === undefined ? STATUS_TYPES.IDLE : (engineLoad <= 85 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING)}
          />
        </div>
      </SectionCard>

      {/* 5. LIVE TELEMETRY CHART */}
      <SectionCard
        title={`Live Telemetry Stream (${activeUavId})`}
        subtitle="High-frequency parameter tracking across rotational and thermal envelopes"
      >
        <TelemetryStreamChart
          title={`Multi-Channel Stream — ${activeUavId}`}
          data={activeChartData}
          height={260}
          emptyMessage={isConnected ? `Buffering telemetry stream for ${activeUavId}...` : 'Waiting for real-time telemetry...'}
        />
      </SectionCard>

      {/* 6, 7, 8. OPERATIONAL TRIPLE-PANEL: DIGITAL TWIN, AI STATUS, MISSION STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 6. DIGITAL TWIN STATUS */}
        <SectionCard
          title="Digital Twin Status"
          subtitle={`Physical expectations vs ${activeUavId} telemetry & residuals`}
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
              { code: 'RPM', actual: rpm, expected: PARAM_BASELINES.RPM.baseline, unit: PARAM_BASELINES.RPM.unit },
              { code: 'CHT', actual: cht, expected: PARAM_BASELINES.CHT.baseline, unit: PARAM_BASELINES.CHT.unit },
              { code: 'EGT', actual: egt, expected: PARAM_BASELINES.EGT.baseline, unit: PARAM_BASELINES.EGT.unit },
              { code: 'OIL_P', actual: oilPressure, expected: PARAM_BASELINES.OIL_P.baseline, unit: PARAM_BASELINES.OIL_P.unit },
            ].map((p) => {
              const hasAct = p.actual !== undefined && p.actual !== null;
              const actStr = hasAct ? Number(p.actual).toFixed(1) : '--';
              const expStr = Number(p.expected).toFixed(1);
              const devVal = hasAct ? (p.actual - p.expected).toFixed(1) : '--';
              const absDev = hasAct ? Math.abs(p.actual - p.expected) : 0;
              const devColor = !hasAct
                ? 'text-slate-500'
                : absDev > (p.code === 'CHT' ? 15 : p.code === 'OIL_P' ? 0.6 : 100)
                  ? 'text-rose-400'
                  : absDev > (p.code === 'CHT' ? 8 : p.code === 'OIL_P' ? 0.3 : 50)
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
              <span>TWIN ID: TWIN-{activeUavId}</span>
              <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>
                {isConnected ? 'TRACKING ACTIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* 7. AI DIAGNOSTICS */}
        <SectionCard
          title="AI Diagnostics & Anomaly"
          subtitle={`Classifier inference, Isolation Forest, and RUL for ${activeUavId}`}
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
                {predictedFault && predictedFault !== 'NORMAL' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className={`font-bold ${
                  predictedFault === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {predictedFault || 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Anomaly & RUL Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">ANOMALY STATUS</span>
                <span className={`font-bold block ${
                  anomalyStatus === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {anomalyStatus || 'NORMAL'}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  SCORE: {anomalyScore !== null ? anomalyScore.toFixed(4) : '--'}
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5">PREDICTED RUL</span>
                <span className="font-bold text-slate-200 block">
                  {rulVal !== '--' ? `${rulVal} hrs` : '--'}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  RF REGRESSOR
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-800/60 pt-1.5">
              <span>TARGET: {activeUavId}</span>
              <span>MODELS: RF + IFOREST</span>
            </div>
          </div>
        </SectionCard>

        {/* 8. MISSION STATUS */}
        <SectionCard
          title="Mission Risk & Advisory"
          subtitle={`Multi-factor decision engine evaluation for ${activeUavId}`}
          action={<RiskBadge level={riskLevel} />}
        >
          <div className="space-y-2.5 font-mono text-xs">
            {/* Reliability Rating */}
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-400 text-[10px]">MISSION RELIABILITY SCORE</span>
                <span className="font-bold text-slate-200">
                  {healthVal !== null ? `${Math.round(healthVal)}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    healthVal === null
                      ? 'bg-slate-700 w-0'
                      : healthVal >= 80
                        ? 'bg-emerald-500'
                        : healthVal >= 60
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                  }`}
                  style={{ width: healthVal !== null ? `${Math.min(100, Math.max(0, healthVal))}%` : '0%' }}
                />
              </div>
            </div>

            {/* Recommendation */}
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-0.5">AUTONOMOUS RECOMMENDATION</span>
              <span className={`font-bold ${
                recommendation === 'CONTINUE_MISSION'
                  ? 'text-emerald-400'
                  : recommendation === 'PROCEED_WITH_CAUTION'
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}>
                {recommendation ? recommendation.replace(/_/g, ' ') : 'STANDBY'}
              </span>
            </div>

            {/* Reason Codes */}
            <div className="text-[10px]">
              <span className="text-slate-400 block mb-1">EVALUATION REASON CODES:</span>
              {reasonCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {reasonCodes.map((rc, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[9px]">
                      {rc}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">
                  Nominal flight envelope. No risk escalation flags.
                </span>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
        </>
      )}
    </div>
  );
}
