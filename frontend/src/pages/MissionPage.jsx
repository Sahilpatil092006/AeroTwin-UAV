import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import HealthIndicator from '../components/HealthIndicator';
import RiskBadge from '../components/RiskBadge';
import { STATUS_TYPES } from '../utils/status';
import { ShieldCheck, Crosshair, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function MissionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MISSION RELIABILITY"
        title="Mission Reliability & Flight Risk"
        description="Probabilistic engine survivability estimation per flight phase, contingency margins, and autonomous abort decision thresholds."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">FLIGHT STATUS:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              PRE-FLIGHT STANDBY
            </span>
          </div>
        }
      />

      {/* Top Level Mission Readiness Indices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthIndicator
          label="Mission Success Probability"
          value={null}
          status={STATUS_TYPES.IDLE}
          subtext="Awaiting flight telemetry"
        />
        <MetricCard
          title="Overall Risk Level"
          value="UNKNOWN"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Pre-flight baseline"
          icon={ShieldCheck}
        />
        <MetricCard
          title="Abort Decision Threshold"
          value="NOMINAL"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="No immediate hazard flags"
          icon={AlertOctagon}
        />
        <MetricCard
          title="Target Endurance"
          value="18.0"
          unit="hrs"
          status={STATUS_TYPES.IDLE}
          subtext="MALE UAV Standard Mission Profile"
          icon={Crosshair}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase-by-Phase Survival Probabilities */}
        <SectionCard
          title="Phase-by-Phase Survival Forecast"
          subtitle="Dynamic survivability probability across defined mission milestones"
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              { phase: 'Phase 1: Takeoff & Initial Climb', duration: '0.8 hrs', prob: '-- %', status: 'STANDBY' },
              { phase: 'Phase 2: Ingress to Station', duration: '2.5 hrs', prob: '-- %', status: 'STANDBY' },
              { phase: 'Phase 3: Tactical Loiter (Station 1)', duration: '8.0 hrs', prob: '-- %', status: 'STANDBY' },
              { phase: 'Phase 4: High-Speed Dash / Relocation', duration: '1.2 hrs', prob: '-- %', status: 'STANDBY' },
              { phase: 'Phase 5: Return to Base (RTB) & Landing', duration: '2.0 hrs', prob: '-- %', status: 'STANDBY' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{p.phase}</span>
                  <span className="text-[10px] text-slate-400">ESTIMATED DURATION: {p.duration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-bold">{p.prob}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Contingency Rules & Throttle De-rating Advisories */}
        <SectionCard
          title="Contingency & De-Rating Advisories"
          subtitle="Automatic mitigation recommendations to preserve engine life"
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Thermal De-rating Contingency</span>
                <span className="text-slate-400 text-[10px]">RULE #PR-04</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                If CHT exceeds 130 °C for &gt; 120s, limit TLA to 75% and increase airspeed by +10 kts to boost ram-air cooling.
              </p>
            </div>

            <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                <span>Low Oil Pressure Abort Rule</span>
                <span className="text-slate-400 text-[10px]">RULE #PR-09</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                If Oil Pressure falls below 1.5 bar for &gt; 10s, trigger immediate Return-to-Base (RTB) flight vector.
              </p>
            </div>

            <div className="p-3 rounded bg-slate-950/40 border border-dashed border-slate-800 text-center text-slate-400">
              Active mission risk calculations will bind to live telemetry in Step 3.
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
