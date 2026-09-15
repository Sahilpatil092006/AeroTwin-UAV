import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import RiskBadge from '../components/RiskBadge';
import { STATUS_TYPES } from '../utils/status';
import { Sliders, Play, RotateCcw, AlertTriangle, Compass } from 'lucide-react';

export default function WhatIfPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // WHAT-IF SIMULATOR"
        title="What-If Scenario & Stress Simulator"
        description="Forward-project engine behavior and mission risk under altered flight trajectories, severe atmospheric anomalies, or component degradation."
        actions={
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-not-allowed opacity-60"
            >
              <Play className="w-3.5 h-3.5" />
              <span>RUN WHAT-IF FORECAST</span>
            </button>
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Controls */}
        <SectionCard
          title="Scenario Parameters"
          subtitle="Adjust flight conditions for predictive projection"
          className="lg:col-span-1"
        >
          <div className="space-y-4 font-mono text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>SIMULATED ALTITUDE</span>
                <span className="text-sky-400 font-bold">18,000 ft</span>
              </div>
              <input
                type="range"
                disabled
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-not-allowed opacity-60"
              />
              <span className="text-[10px] text-slate-400">Turbocharger boost boundary: 22,000 ft</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>AMBIENT DELTA (ISA + ΔT)</span>
                <span className="text-sky-400 font-bold">+15 °C (Extreme Heat)</span>
              </div>
              <input
                type="range"
                disabled
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-not-allowed opacity-60"
              />
              <span className="text-[10px] text-slate-400">Degrades cooling efficiency by ~18%</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>SUSTAINED THROTTLE DEMAND</span>
                <span className="text-sky-400 font-bold">85% (Continuous Climb)</span>
              </div>
              <input
                type="range"
                disabled
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-not-allowed opacity-60"
              />
              <span className="text-[10px] text-slate-400">High thermal stress operational envelope</span>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>INDUCED INJECTOR DRIFT</span>
                <span className="text-sky-400 font-bold">None (Nominal)</span>
              </div>
              <input
                type="range"
                disabled
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-not-allowed opacity-60"
              />
              <span className="text-[10px] text-slate-400">Air-fuel ratio deviation factor</span>
            </div>
          </div>
        </SectionCard>

        {/* Projected Engine Outcome */}
        <SectionCard
          title="Projected Engine Stress & Mission Forecast"
          subtitle="Model predictions calculated across simulated flight phase"
          className="lg:col-span-2"
          action={<RiskBadge level="UNKNOWN" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <MetricCard
              title="Forecasted Peak CHT"
              value="--"
              unit="°C"
              status={STATUS_TYPES.IDLE}
              subtext="Limit: 135 °C"
            />
            <MetricCard
              title="Forecasted Peak EGT"
              value="--"
              unit="°C"
              status={STATUS_TYPES.IDLE}
              subtext="Limit: 880 °C"
            />
            <MetricCard
              title="Projected Mission Survival Probability"
              value="--"
              unit="%"
              status={STATUS_TYPES.IDLE}
              subtext="Monte Carlo simulation threshold"
            />
            <MetricCard
              title="Thermal Stress Margin"
              value="--"
              unit="%"
              status={STATUS_TYPES.IDLE}
              subtext="Safety buffer before redline"
            />
          </div>

          <div className="p-4 rounded bg-slate-950/50 border border-dashed border-slate-800 text-center font-mono text-xs text-slate-400">
            Awaiting scenario execution. What-If projections will synthesize when simulation engine is initiated.
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
