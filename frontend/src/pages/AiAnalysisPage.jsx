import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { BrainCircuit, Target, AlertTriangle, TrendingDown } from 'lucide-react';

export default function AiAnalysisPage() {
  const { isConnected, ai } = useTelemetry();

  const anomalyVal = isConnected && ai?.anomaly_score !== undefined
    ? ai.anomaly_score.toFixed(4)
    : '--';
  const anomalyStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : ai?.anomaly_status === 'NORMAL' ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING;

  const rulVal = isConnected && ai?.predicted_rul_hours !== undefined
    ? ai.predicted_rul_hours
    : '--';
  const rulStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : (typeof rulVal === 'number' && rulVal > 100 ? STATUS_TYPES.HEALTHY : STATUS_TYPES.WARNING);

  const faultClass = isConnected && ai?.predicted_fault ? ai.predicted_fault : 'NONE';
  const faultStatus = !isConnected
    ? STATUS_TYPES.IDLE
    : faultClass === 'NORMAL' ? STATUS_TYPES.HEALTHY : STATUS_TYPES.CRITICAL;

  const faultClasses = [
    { key: 'NORMAL', label: 'Normal / Healthy Operation' },
    { key: 'INJECTOR_ABNORMALITY', label: 'Fuel Injector Abnormality' },
    { key: 'COOLING_PROBLEM', label: 'Thermal Cooling Problem' },
    { key: 'LUBRICATION_PROBLEM', label: 'Oil Lubrication Problem' },
    { key: 'MISFIRE', label: 'Cylinder Misfire Event' },
    { key: 'SENSOR_ANOMALY', label: 'Sensor Drift / Anomaly' },
  ];

  const engineStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // AI ANALYTICS"
        title="AI Predictive Analytics & Diagnostics"
        description="Machine learning inference pipeline executing semi-supervised anomaly detection, multi-class fault classification, and Remaining Useful Life (RUL) regression."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">INFERENCE ENGINE:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${engineStatusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'INFERENCE ACTIVE (LIVE)' : 'MODELS LOADED (AWAITING SENSOR VECTORS)'}
            </span>
          </div>
        }
      />

      {/* Model Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Anomaly Score (Isolation Forest)"
          value={anomalyVal}
          unit=""
          status={anomalyStatus}
          subtext={isConnected && ai?.anomaly_status ? `Status: ${ai.anomaly_status}` : 'Baseline Threshold: 0.15'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Predicted RUL"
          value={rulVal}
          unit="hrs"
          status={rulStatus}
          subtext={isConnected ? 'RandomForest Regressor' : 'Confidence Interval: 95%'}
          icon={TrendingDown}
        />
        <MetricCard
          title="Primary Fault Class"
          value={faultClass}
          unit=""
          status={faultStatus}
          subtext={isConnected ? 'Fault Classifier Output' : 'Classification Model: Standby'}
          icon={Target}
        />
        <MetricCard
          title="Inference Latency"
          value={isConnected ? '< 5' : '--'}
          unit="ms"
          status={isConnected ? STATUS_TYPES.HEALTHY : STATUS_TYPES.IDLE}
          subtext="Model Cycle Runtime"
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
            {faultClasses.map((cls) => {
              const prob = isConnected && ai?.fault_probabilities?.[cls.key] !== undefined
                ? ai.fault_probabilities[cls.key]
                : 0;
              const pct = Math.round(prob * 100);
              const isDominant = isConnected && ai?.predicted_fault === cls.key;

              return (
                <div key={cls.key} className="space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className={isDominant ? 'font-bold text-sky-300' : ''}>
                      {cls.label}
                    </span>
                    <span className={`font-bold ${isDominant ? 'text-sky-400' : 'text-slate-400'}`}>
                      {isConnected ? `${pct}%` : '-- %'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        cls.key === 'NORMAL'
                          ? 'bg-emerald-500'
                          : isDominant
                            ? 'bg-amber-400'
                            : 'bg-slate-600'
                      }`}
                      style={{ width: isConnected ? `${pct}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Feature Importance / Physical Attribution */}
        <SectionCard
          title="Diagnostic Assessment & Attribution"
          subtitle="Real-time multi-model fault and anomaly synthesis"
        >
          <div className="h-full flex flex-col justify-between p-4 bg-slate-950/40 rounded border border-slate-800 text-xs font-mono">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="font-semibold text-slate-200">
                  {isConnected ? 'Active Diagnostic Interpretation' : 'Diagnostic Pipeline Standby'}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isConnected && ai
                  ? `AI subsystem evaluation: Current telemetry condition identified as ${ai.predicted_fault}. Anomaly detection classifies operational envelope as ${ai.anomaly_status} (normalized score: ${(ai.anomaly_score ?? 0).toFixed(4)}). Predicted Remaining Useful Life is ${ai.predicted_rul_hours} operating hours before reaching maintenance threshold.`
                  : 'Awaiting real-time telemetry inputs to synthesize multi-model diagnostic report.'}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>PIPELINE: IsolationForest + RF Classifier + RUL Regressor</span>
              <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                {isConnected ? 'STREAMING' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
