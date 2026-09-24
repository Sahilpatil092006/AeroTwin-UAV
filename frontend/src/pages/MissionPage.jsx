import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import HealthIndicator from '../components/HealthIndicator';
import LoadingState from '../components/LoadingState';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
import { ShieldCheck, Crosshair, AlertOctagon, Plane, Activity, Cpu, Clock, AlertTriangle } from 'lucide-react';

export default function MissionPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds, loading } = useFleet();
  const { isConnected: wsConnected, mission: defaultMission } = useTelemetry();

  // Unified single source of truth for active UAV
  // Fall back to WebSocket default ONLY for UAV-001 when fleet polling is initializing
  const uav = activeUavState;
  const isUav1 = activeUavId === 'UAV-001';

  const hasLiveUav = Boolean(uav && (uav.engine_telemetry || uav.engine_health !== undefined));
  const isConnected = hasLiveUav || (isUav1 && wsConnected);

  // If initial load in progress for non-cached UAV
  if (loading && !hasLiveUav && !isUav1) {
    return (
      <div className="space-y-6">
        <PageHeader
          systemTag="AEROTWIN // MISSION RELIABILITY"
          title="Mission Reliability & Flight Risk"
          description="Probabilistic engine survivability estimation per flight phase, contingency margins, and autonomous abort decision thresholds."
        />
        <LoadingState message={`Connecting to live Mission Risk Engine for ${activeUavId}...`} />
      </div>
    );
  }

  // 1. Mission Reliability Score (0-100%)
  const rawRel = uav?.mission_reliability_score !== undefined
    ? Number(uav.mission_reliability_score)
    : (isUav1 && defaultMission?.mission_reliability_score !== undefined
      ? Number(defaultMission.mission_reliability_score)
      : (uav?.engine_health !== undefined
        ? Math.round(Math.max(10, Math.min(100, Number(uav.engine_health) * 0.45 + Number(uav.fitness_score || 80) * 0.35 + (1 - Number(uav.anomaly_score || 0)) * 20)) * 10) / 10
        : null));
  const relScore = isConnected && rawRel !== null ? Math.round(rawRel * 10) / 10 : (isConnected ? 100 : null);
  const relStatus = !isConnected || relScore === null
    ? STATUS_TYPES.IDLE
    : relScore >= 80 ? STATUS_TYPES.HEALTHY : relScore >= 60 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

  // 2. Risk Level & Advisory
  const rawRisk = uav?.mission_risk || (isUav1 ? defaultMission?.mission_risk : null) || 'LOW';
  const riskLevel = isConnected ? rawRisk.toUpperCase() : 'UNKNOWN';
  const riskStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : riskLevel === 'LOW' ? STATUS_TYPES.HEALTHY : riskLevel === 'MEDIUM' ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

  const rawAdvisory = uav?.recommendation || (isUav1 ? defaultMission?.mission_recommendation : null) || 'CONTINUE_MISSION';
  const advisory = isConnected ? rawAdvisory : 'STANDBY';
  const advisoryStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : advisory === 'CONTINUE_MISSION'
      ? STATUS_TYPES.HEALTHY
      : advisory === 'PROCEED_WITH_CAUTION'
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  // 3. Operational & Telemetry Diagnostics (Strictly isolated to active UAV)
  const currentPhase = uav?.flight_phase || uav?.engine_telemetry?.flight_phase || 'CRUISE';
  const rawHealth = uav?.engine_health !== undefined
    ? Number(uav.engine_health)
    : (isUav1 && defaultMission?.engine_health !== undefined ? Number(defaultMission.engine_health) : null);
  const healthNum = isConnected && rawHealth !== null ? Math.round(rawHealth * 10) / 10 : null;

  const rawFitness = (uav?.engine_fitness_score ?? uav?.fitness_score) !== undefined
    ? Number(uav.engine_fitness_score ?? uav.fitness_score)
    : (isUav1 && defaultMission?.engine_fitness_score !== undefined ? Number(defaultMission.engine_fitness_score) : null);
  const fitnessNum = isConnected && rawFitness !== null ? Math.round(rawFitness * 10) / 10 : null;

  const rawRul = (uav?.predicted_rul ?? uav?.predicted_rul_hours) !== undefined
    ? Number(uav.predicted_rul ?? uav.predicted_rul_hours)
    : (isUav1 && defaultMission?.predicted_rul_hours !== undefined ? Number(defaultMission.predicted_rul_hours) : null);
  const rulNum = isConnected && rawRul !== null ? Math.round(rawRul) : null;

  const predictedFault = uav?.predicted_fault || (isUav1 && defaultMission?.predicted_fault ? defaultMission.predicted_fault : 'NORMAL');
  const anomalyStatus = (uav?.anomaly_status || (isUav1 && defaultMission?.anomaly_status ? defaultMission.anomaly_status : 'NORMAL')).toUpperCase();
  const rawAnomalyScore = uav?.anomaly_score !== undefined
    ? Number(uav.anomaly_score)
    : (isUav1 && defaultMission?.anomaly_score !== undefined ? Number(defaultMission.anomaly_score) : 0.0);

  // 4. Decision Codes & Mitigation Rationale
  const reasonCodes = (uav?.reason_codes && uav.reason_codes.length > 0)
    ? uav.reason_codes
    : (isUav1 && defaultMission?.reason_codes ? defaultMission.reason_codes : []);

  const explanation = uav?.explanation || (isUav1 ? defaultMission?.explanation : null) || (
    isConnected
      ? `Engine advisory: ${advisory}. Current mission reliability score is ${relScore ?? 100}%. Risk evaluation is classified as ${riskLevel}.`
      : 'Engine offline. Waiting for live telemetry broadcast.'
  );

  const statusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  const phases = [
    { phase: 'Phase 1: Takeoff & Initial Climb', code: 'TAKEOFF', duration: '0.8 hrs' },
    { phase: 'Phase 2: Ingress to Station', code: 'CLIMB', duration: '2.5 hrs' },
    { phase: 'Phase 3: Tactical Loiter (Station 1)', code: 'CRUISE', duration: '8.0 hrs' },
    { phase: 'Phase 4: High-Speed Dash / Relocation', code: 'LOITER', duration: '1.2 hrs' },
    { phase: 'Phase 5: Return to Base & Landing', code: 'LANDING', duration: '2.0 hrs' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MISSION RELIABILITY"
        title="Mission Reliability & Flight Risk"
        description="Probabilistic engine survivability estimation per flight phase, contingency margins, and autonomous abort decision thresholds."
        actions={
          <div className="flex items-center gap-2">
            {/* Active UAV Selector */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 text-xs font-mono">
              <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-bold tracking-wider">UAV:</span>
              <select
                id="select-mission-uav"
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

            <span className="text-xs font-mono text-slate-400 hidden sm:inline">FLIGHT STATUS:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${statusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? `ACTIVE // ${currentPhase} (${activeUavId})` : 'PRE-FLIGHT STANDBY'}
            </span>
          </div>
        }
      />

      {/* Top Level Mission Readiness Indices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthIndicator
          label="Mission Reliability Score"
          value={relScore}
          status={relStatus}
          subtext={isConnected ? `Synthesized for ${activeUavId}` : 'Awaiting flight telemetry'}
        />
        <MetricCard
          title="Overall Risk Level"
          value={riskLevel}
          unit=""
          status={riskStatus}
          subtext={isConnected ? `Decision: ${advisory.replace(/_/g, ' ')}` : 'Pre-flight baseline'}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Mission Advisory"
          value={advisory}
          unit=""
          status={advisoryStatus}
          subtext={isConnected ? 'Autonomous Decision Engine' : 'No immediate hazard flags'}
          icon={AlertOctagon}
        />
        <MetricCard
          title="Planned Duration"
          value="10.0"
          unit="hrs"
          status={isConnected ? STATUS_TYPES.HEALTHY : STATUS_TYPES.IDLE}
          subtext="MALE UAV Standard Mission Profile"
          icon={Crosshair}
        />
      </div>

      {/* Key Diagnostic Telemetry & AI Synthesis Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          title="Engine Health"
          value={healthNum !== null ? `${healthNum}%` : '--'}
          unit=""
          status={!isConnected || healthNum === null ? STATUS_TYPES.IDLE : healthNum >= 80 ? STATUS_TYPES.HEALTHY : healthNum >= 60 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL}
          subtext={`Current ${activeUavId} Condition`}
          icon={Activity}
        />
        <MetricCard
          title="Fitness Score"
          value={fitnessNum !== null ? `${fitnessNum}%` : '--'}
          unit=""
          status={!isConnected || fitnessNum === null ? STATUS_TYPES.IDLE : fitnessNum >= 80 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING}
          subtext="Operational Baseline"
          icon={Cpu}
        />
        <MetricCard
          title="Predicted RUL"
          value={rulNum !== null ? `${rulNum}` : '--'}
          unit="hrs"
          status={!isConnected || rulNum === null ? STATUS_TYPES.IDLE : rulNum > 100 ? STATUS_TYPES.HEALTHY : rulNum > 50 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL}
          subtext="Remaining Useful Life"
          icon={Clock}
        />
        <MetricCard
          title="Predicted Fault"
          value={isConnected ? predictedFault.replace(/_/g, ' ') : '--'}
          unit=""
          status={!isConnected ? STATUS_TYPES.IDLE : predictedFault === 'NORMAL' ? STATUS_TYPES.HEALTHY : STATUS_TYPES.CRITICAL}
          subtext="AI Classifier Mode"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Anomaly Score"
          value={isConnected ? rawAnomalyScore.toFixed(4) : '--'}
          unit=""
          status={!isConnected ? STATUS_TYPES.IDLE : (anomalyStatus === 'NORMAL' || rawAnomalyScore < 0.2) ? STATUS_TYPES.HEALTHY : rawAnomalyScore < 0.6 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL}
          subtext={isConnected ? anomalyStatus : 'Unsupervised AI Model'}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase-by-Phase Survival Probabilities */}
        <SectionCard
          title="Phase-by-Phase Operational Matrix"
          subtitle={`Dynamic status and survival projection across defined mission milestones for ${activeUavId}`}
        >
          <div className="space-y-3 font-mono text-xs">
            {phases.map((p, idx) => {
              const isActive = isConnected && currentPhase.toUpperCase() === p.code;
              const prob = isConnected ? (relScore !== null ? `${relScore}%` : '100%') : '-- %';

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded border transition-colors ${
                    isActive
                      ? 'bg-sky-950/40 border-sky-800'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />}
                      <span className={`font-semibold ${isActive ? 'text-sky-300' : 'text-slate-200'}`}>
                        {p.phase}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">ESTIMATED DURATION: {p.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${isActive ? 'text-sky-400' : 'text-slate-300'}`}>
                      {prob}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${
                      isActive
                        ? 'bg-sky-900/60 text-sky-300 border-sky-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {isActive ? 'CURRENT PHASE' : isConnected ? 'QUEUED' : 'STANDBY'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Contingency Rules & Throttle De-rating Advisories */}
        <SectionCard
          title="Active Reason Codes & Decision Factors"
          subtitle={`Automatic mitigation rationale from Mission Decision Engine for ${activeUavId}`}
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Mission Engine Evaluation ({activeUavId})</span>
                <span className="text-slate-400 text-[10px]">EVAL // LIVE</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {explanation}
              </p>
            </div>

            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Active Diagnostic Codes ({activeUavId})</span>
                <span className="text-slate-400 text-[10px]">CODES</span>
              </div>
              {isConnected && reasonCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {reasonCodes.map((rc, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/60">
                      {rc}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-[11px] mt-1">
                  {isConnected ? 'No risk escalation reason codes active. Operating within safety margins.' : 'No reason codes registered.'}
                </p>
              )}
            </div>

            <div className="p-3 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-400 text-[11px]">
              {isConnected
                ? `Mission Risk Engine dynamically linked to live telemetry and Digital Twin for ${activeUavId}.`
                : 'Active mission risk calculations standby.'}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
