import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import StatusCard from '../components/StatusCard';
import { STATUS_TYPES } from '../utils/status';
import { BrainCircuit, Target, AlertTriangle, TrendingDown } from 'lucide-react';

export default function AiAnalysisPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // AI ANALYTICS"
        title="AI Predictive Analytics & Diagnostics"
        description="Machine learning inference pipeline executing semi-supervised anomaly detection, multi-class fault classification, and Remaining Useful Life (RUL) regression."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">INFERENCE ENGINE:</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
              MODELS LOADED (AWAITING SENSOR VECTORS)
            </span>
          </div>
        }
      />

      {/* Model Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Anomaly Score (Reconstruction Error)"
          value="--"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Baseline Threshold: 0.042"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Predicted RUL"
          value="--"
          unit="hrs"
          status={STATUS_TYPES.IDLE}
          subtext="Confidence Interval: 95%"
          icon={TrendingDown}
        />
        <MetricCard
          title="Primary Fault Class"
          value="NONE"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Classification Model: Standby"
          icon={Target}
        />
        <MetricCard
          title="Inference Latency"
          value="--"
          unit="ms"
          status={STATUS_TYPES.IDLE}
          subtext="Edge Model Runtime"
          icon={BrainCircuit}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fault Probability Distribution */}
        <SectionCard
          title="Multi-Class Fault Probability Matrix"
          subtitle="Real-time softmax probability across recognized failure modes"
        >
          <div className="space-y-3 font-mono text-xs">
            {[
              { label: 'Normal / Healthy Operation', classId: 'CLASS_0' },
              { label: 'Fuel Injector Clog / Lean Mixture', classId: 'CLASS_1' },
              { label: 'Cylinder Valve Leakage / Blowby', classId: 'CLASS_2' },
              { label: 'Thermal Cooling Degradation', classId: 'CLASS_3' },
              { label: 'Oil Lubrication Starvation', classId: 'CLASS_4' },
              { label: 'Turbocharger Boost Loss / Stiction', classId: 'CLASS_5' },
            ].map((cls) => (
              <div key={cls.classId} className="space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span>{cls.label}</span>
                  <span className="text-slate-400 font-bold">-- %</span>
                </div>
                <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-700 w-0" />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Feature Importance / Physical Attribution */}
        <SectionCard
          title="Physics Attribution & Feature Contributions"
          subtitle="Shapley / residual contribution to predicted degradation state"
        >
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 rounded border border-dashed border-slate-800">
            <BrainCircuit className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-xs font-mono text-slate-400">
              Awaiting real-time telemetry inputs to compute SHAP feature contributions.
            </p>
            <span className="text-[10px] font-mono text-slate-400 mt-1">
              PIPELINE: IsolationForest + Random Forest / GradientBoost Regressor
            </span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
