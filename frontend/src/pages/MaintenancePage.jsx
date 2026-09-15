import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import RiskBadge from '../components/RiskBadge';
import { STATUS_TYPES } from '../utils/status';
import { Wrench, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // PREDICTIVE MAINTENANCE"
        title="Condition-Based Maintenance & RUL"
        description="Continuous health tracking of engine line-replaceable units (LRUs), wear accumulation, and condition-driven maintenance intervals."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">MAINTENANCE STATUS:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              ALL LRUs WITHIN LIMITS
            </span>
          </div>
        }
      />

      {/* High-level wear metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Operating Hours"
          value="--"
          unit="hrs"
          status={STATUS_TYPES.IDLE}
          subtext="Engine Logbook Time"
          icon={Clock}
        />
        <MetricCard
          title="Next Scheduled Inspection"
          value="100 hr"
          unit="check"
          status={STATUS_TYPES.IDLE}
          subtext="Standard 100-Hour Overhaul"
          icon={Calendar}
        />
        <MetricCard
          title="Critical Wear Index"
          value="--"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Composite Degradation Metric"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Maintenance Priority"
          value="ROUTINE"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="No immediate grounding items"
          icon={Wrench}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Replaceable Units (LRU) Wear Tracking */}
        <SectionCard
          title="Subsystem Wear & Degradation Tracking"
          subtitle="Health degradation per engine line-replaceable unit"
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              { lru: 'Spark Plugs & Ignition Harness', wear: '-- %', interval: '50 hrs' },
              { lru: 'Fuel Injector Nozzles (Cyl 1-4)', wear: '-- %', interval: '100 hrs' },
              { lru: 'Oil Filter & Lubricant Degradation', wear: '-- %', interval: '100 hrs' },
              { lru: 'Exhaust Valves & Valve Guides', wear: '-- %', interval: '200 hrs' },
              { lru: 'Turbocharger Wastegate & Bearings', wear: '-- %', interval: '250 hrs' },
              { lru: 'Piston Compression Rings & Cyl Bores', wear: '-- %', interval: '500 hrs' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded bg-slate-950/60 border border-slate-800"
              >
                <div>
                  <span className="font-semibold text-slate-200 block">{item.lru}</span>
                  <span className="text-[10px] text-slate-400">INSPECTION INTERVAL: {item.interval}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 font-bold">WEAR: {item.wear}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                    STANDBY
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Condition-Based Recommendations */}
        <SectionCard
          title="Recommended Maintenance Actions"
          subtitle="Triggered dynamically by AI anomaly detection and RUL forecast"
        >
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 rounded border border-dashed border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-mono text-slate-400">
              No unscheduled maintenance actions required.
            </p>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              RUL degradation tracker awaiting flight telemetry cycles.
            </span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
