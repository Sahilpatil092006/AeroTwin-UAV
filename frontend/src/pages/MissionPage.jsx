import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import HealthIndicator from '../components/HealthIndicator';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { ShieldCheck, Crosshair, AlertOctagon } from 'lucide-react';

export default function MissionPage() {
  const { isConnected, packet, mission } = useTelemetry();

  const relScore = isConnected && mission?.mission_reliability_score !== undefined
    ? Math.round(mission.mission_reliability_score * 10) / 10
    : null;
  const relStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : relScore >= 80 ? STATUS_TYPES.HEALTHY : relScore >= 60 ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

  const riskLevel = isConnected && mission?.mission_risk ? mission.mission_risk : 'UNKNOWN';
  const riskStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : riskLevel === 'LOW' ? STATUS_TYPES.HEALTHY : riskLevel === 'MEDIUM' ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL;

  const advisory = isConnected && mission?.mission_recommendation
    ? mission.mission_recommendation
    : 'NOMINAL';

  const currentPhase = packet?.flight_phase || 'CRUISE';

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
            <span className="text-xs font-mono text-slate-400">FLIGHT STATUS:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${statusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? `ACTIVE // ${currentPhase}` : 'PRE-FLIGHT STANDBY'}
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
          subtext={isConnected ? 'Multi-factor synthesis' : 'Awaiting flight telemetry'}
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
          status={advisory === 'CONTINUE_MISSION' ? STATUS_TYPES.HEALTHY : advisory === 'PROCEED_WITH_CAUTION' ? STATUS_TYPES.WARNING : STATUS_TYPES.CRITICAL}
          subtext={isConnected ? 'Autonomous Risk Assessment' : 'No immediate hazard flags'}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase-by-Phase Survival Probabilities */}
        <SectionCard
          title="Phase-by-Phase Operational Matrix"
          subtitle="Dynamic status and survival projection across defined mission milestones"
        >
          <div className="space-y-3 font-mono text-xs">
            {phases.map((p, idx) => {
              const isActive = isConnected && currentPhase === p.code;
              const prob = isConnected ? (relScore ? `${relScore}%` : '95%') : '-- %';

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
          subtitle="Automatic mitigation rationale from Mission Decision Engine"
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Mission Engine Evaluation</span>
                <span className="text-slate-400 text-[10px]">EVAL // LIVE</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {isConnected && mission
                  ? `Engine advisory: ${mission.mission_recommendation}. Current mission reliability score is ${mission.mission_reliability_score}%. Risk evaluation is classified as ${mission.mission_risk}.`
                  : 'Engine offline. Waiting for live telemetry broadcast.'}
              </p>
            </div>

            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Active Diagnostic Codes</span>
                <span className="text-slate-400 text-[10px]">CODES</span>
              </div>
              {isConnected && mission?.reason_codes?.length ? (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {mission.reason_codes.map((rc, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/60">
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
                ? 'Mission Risk Engine dynamically linked to live telemetry and Digital Twin.'
                : 'Active mission risk calculations standby.'}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
