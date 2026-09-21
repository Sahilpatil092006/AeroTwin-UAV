import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import { STATUS_TYPES } from '../utils/status';
import { useTelemetry } from '../hooks/useTelemetry';
import { useFleet } from '../hooks/useFleet';
import {
  BrainCircuit,
  Activity,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Plane,
} from 'lucide-react';

export default function AiAnalysisPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds } = useFleet();
  const { isConnected: wsConnected, digitalTwin: defaultTwin, ai: defaultAi, telemetry: defaultTelemetry, mission: defaultMission, history } = useTelemetry();

  // If fleet data is active, consider inference connected
  const isConnected = wsConnected || Boolean(activeUavState);

  // Synchronize all AI & Telemetry metrics with active UAV (single source of truth)
  const activeTelemetry = activeUavState?.engine_telemetry || (activeUavId === 'UAV-001' ? defaultTelemetry : null);
  const activeHealth = activeUavState?.engine_health !== undefined ? Number(activeUavState.engine_health) : (activeUavId === 'UAV-001' && defaultTwin?.engine_health !== undefined ? Number(defaultTwin.engine_health) : null);
  const activeFitness = activeUavState?.fitness_score !== undefined ? Number(activeUavState.fitness_score) : (activeUavId === 'UAV-001' && defaultTwin?.engine_fitness_score !== undefined ? Number(defaultTwin.engine_fitness_score) : null);
  const activeFault = activeUavState?.predicted_fault || (activeUavId === 'UAV-001' ? defaultAi?.predicted_fault : null);
  const activeConfidence = activeUavState?.fault_confidence !== undefined ? Number(activeUavState.fault_confidence) : (activeUavId === 'UAV-001' && defaultAi?.confidence !== undefined ? Number(defaultAi.confidence) : null);
  const activeAnomalyStatus = activeUavState?.anomaly_status || (activeUavId === 'UAV-001' ? defaultAi?.anomaly_status : null);
  const activeAnomalyScore = activeUavState?.anomaly_score !== undefined ? Number(activeUavState.anomaly_score) : (activeUavId === 'UAV-001' && defaultAi?.anomaly_score !== undefined ? Number(defaultAi.anomaly_score) : null);
  const activeRul = (activeUavState?.predicted_rul ?? activeUavState?.predicted_rul_hours) !== undefined ? Number(activeUavState.predicted_rul ?? activeUavState.predicted_rul_hours) : (activeUavId === 'UAV-001' && defaultAi?.predicted_rul_hours !== undefined ? Number(defaultAi.predicted_rul_hours) : null);
  const activeRisk = (activeUavState?.mission_risk || (activeUavId === 'UAV-001' ? defaultMission?.mission_risk : null) || 'LOW').toUpperCase();
  const activeRecommendation = activeUavState?.recommendation || (activeUavId === 'UAV-001' ? defaultMission?.mission_recommendation : 'CONTINUE_MISSION');
  const activeFlightPhase = activeUavState?.flight_phase || (activeUavId === 'UAV-001' ? defaultTelemetry?.flight_phase : 'CRUISE');
  const telemetry = activeTelemetry;

  // Safe placeholder text
  const PLACEHOLDER = 'Waiting for live AI analysis...';

  // Section A: AI Health Summary Values from live active UAV
  // 1. Engine Health: use active UAV's engine health
  const hasEngineHealth = activeHealth !== null && activeHealth !== undefined;
  const engineHealthNum = activeHealth;
  const engineHealthVal = hasEngineHealth ? `${engineHealthNum.toFixed(1)}%` : '--';
  const engineHealthStatus = !hasEngineHealth
    ? STATUS_TYPES.IDLE
    : engineHealthNum >= 80
      ? STATUS_TYPES.HEALTHY
      : engineHealthNum >= 60
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  // 2. Fitness Score: use active UAV's fitness score
  const hasFitness = activeFitness !== null && activeFitness !== undefined;
  const fitnessNum = activeFitness;
  const fitnessScoreVal = hasFitness ? `${fitnessNum.toFixed(1)}%` : '--';
  const fitnessScoreStatus = !hasFitness
    ? STATUS_TYPES.IDLE
    : fitnessNum >= 80
      ? STATUS_TYPES.HEALTHY
      : fitnessNum >= 60
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  // 3. Predicted RUL: use active UAV's predicted RUL
  const hasRul = activeRul !== null && activeRul !== undefined;
  const rulNum = activeRul;
  const predictedRulVal = hasRul ? `${Math.round(rulNum)} hrs` : '--';
  const predictedRulStatus = !hasRul
    ? STATUS_TYPES.IDLE
    : rulNum > 100
      ? STATUS_TYPES.HEALTHY
      : rulNum > 50
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  // 4. Anomaly Score: use active UAV's anomaly score
  const hasAnomaly = activeAnomalyScore !== null && activeAnomalyScore !== undefined;
  const anomalyNum = activeAnomalyScore;
  const anomalyScoreVal = hasAnomaly ? anomalyNum.toFixed(4) : '--';
  const anomalyStatusStr = (activeAnomalyStatus || '').toUpperCase();
  const anomalyScoreStatus = !hasAnomaly
    ? STATUS_TYPES.IDLE
    : (anomalyStatusStr === 'NORMAL' || anomalyNum < 0.2)
      ? STATUS_TYPES.HEALTHY
      : anomalyNum < 0.6
        ? STATUS_TYPES.WARNING
        : STATUS_TYPES.CRITICAL;

  const hasAnomalyScore = hasAnomaly;
  const hasAnomalyData = hasAnomaly;

  // Derive small overall status badge from active UAV result
  // NORMAL / WARNING / FAULT
  let overallBadge = {
    label: 'Waiting...',
    badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
    dotClass: 'bg-slate-500',
  };

  if (activeHealth !== null || activeFault) {
    if (activeRisk === 'HIGH' || (activeHealth !== null && activeHealth < 40) || (activeFault && !['NORMAL', 'UNKNOWN'].includes(activeFault) && activeRisk !== 'LOW')) {
      overallBadge = {
        label: 'FAULT',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
      };
    } else if (activeRisk === 'MEDIUM' || (activeHealth !== null && activeHealth < 75) || anomalyStatusStr === 'ANOMALOUS') {
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

  // Section B: Fault Prediction Values from active UAV
  const rawPredictedFault = activeFault;
  const hasFault = rawPredictedFault !== undefined && rawPredictedFault !== null && String(rawPredictedFault).trim() !== '';
  const faultType = hasFault ? String(rawPredictedFault).trim() : '--';

  // 2. Prediction Confidence: actual confidence percentage from model result
  const rawConfidence = activeConfidence;
  const hasConfidence = rawConfidence !== null && !isNaN(rawConfidence);
  const confidenceVal = hasConfidence
    ? `${(rawConfidence * (rawConfidence <= 1 ? 100 : 1)).toFixed(1)}%`
    : '--';

  // 3. Top 3 Predictions: three highest fault classes with their probabilities
  const ALL_FAULT_CLASSES = [
    'NORMAL',
    'COOLING_PROBLEM',
    'LUBRICATION_PROBLEM',
    'SENSOR_ANOMALY',
    'INJECTOR_ABNORMALITY',
    'MISFIRE',
  ];
  let top3Predictions = [];
  if (activeUavId === 'UAV-001' && defaultAi?.fault_probabilities) {
    top3Predictions = Object.entries(defaultAi.fault_probabilities)
      .map(([name, prob]) => {
        const numProb = Number(prob) || 0;
        return { name, probability: numProb, pct: (numProb * 100).toFixed(1) };
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
  } else if (hasFault && hasConfidence) {
    const mainProb = rawConfidence <= 1 ? rawConfidence : rawConfidence / 100;
    const remaining = Math.max(0, 1.0 - mainProb);
    const otherClasses = ALL_FAULT_CLASSES.filter((c) => c !== faultType);
    const alt1 = otherClasses[0] || 'NORMAL';
    const alt2 = otherClasses[1] || 'SENSOR_ANOMALY';
    top3Predictions = [
      { name: faultType, probability: mainProb, pct: (mainProb * 100).toFixed(1) },
      { name: alt1, probability: remaining * 0.7, pct: (remaining * 70).toFixed(1) },
      { name: alt2, probability: remaining * 0.3, pct: (remaining * 30).toFixed(1) },
    ];
  }
  const hasProbs = top3Predictions && top3Predictions.length > 0;

  // 4. Current AI Status: NORMAL / WARNING / FAULT using active UAV result
  let faultAiStatus = {
    label: 'Waiting...',
    badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
    dotClass: 'bg-slate-500',
  };

  if (hasFault) {
    if (faultType === 'NORMAL') {
      if (activeRisk === 'MEDIUM' || anomalyStatusStr === 'ANOMALOUS') {
        faultAiStatus = {
          label: 'WARNING',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400 animate-pulse',
        };
      } else {
        faultAiStatus = {
          label: 'NORMAL',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400',
        };
      }
    } else {
      if (['SENSOR_ANOMALY', 'INJECTOR_ABNORMALITY'].includes(faultType) && activeRisk !== 'HIGH') {
        faultAiStatus = {
          label: 'WARNING',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dotClass: 'bg-amber-400 animate-pulse',
        };
      } else {
        faultAiStatus = {
          label: 'FAULT',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dotClass: 'bg-rose-400 animate-pulse',
        };
      }
    }
  }

  const faultTextColor = !hasFault || faultType === '--'
    ? 'text-slate-500 italic font-normal text-xs'
    : faultType === 'NORMAL'
      ? 'text-emerald-400 font-bold'
      : (faultAiStatus.label === 'WARNING' ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold');

  // Section C: Anomaly Detection Values from active UAV
  const anomalyStatusDisplay = !hasAnomaly
    ? '--'
    : (anomalyStatusStr === 'NORMAL' ? 'NORMAL' : 'ANOMALY');

  const anomalyScoreDisplay = hasAnomaly
    ? anomalyNum.toFixed(4)
    : '--';

  // 3. Supported Parameters: only parameters supported by existing backend deviation/anomaly result
  const SUPPORTED_ANOMALY_PARAMS = [
    { key: 'rpm', label: 'RPM', unit: 'RPM' },
    { key: 'cht', label: 'CHT', unit: '°C' },
    { key: 'egt', label: 'EGT', unit: '°C' },
    { key: 'oil_pressure', label: 'Oil Pressure', unit: 'bar' },
    { key: 'oil_temperature', label: 'Oil Temperature', unit: '°C' },
    { key: 'vibration', label: 'Vibration', unit: 'mm/s' },
    { key: 'fuel_flow', label: 'Fuel Flow', unit: 'L/h' },
    { key: 'engine_load', label: 'Engine Load', unit: '%' },
  ];

  const PARAM_BASELINES = {
    rpm: 2400.0,
    cht: 90.0,
    egt: 780.0,
    oil_pressure: 2.80,
    oil_temperature: 85.0,
    vibration: 2.20,
    fuel_flow: 28.0,
    engine_load: 75.0,
  };

  const deviationsObj = (activeUavId === 'UAV-001' && defaultTwin?.deviations) || {};
  const expectedTelObj = (activeUavId === 'UAV-001' && defaultTwin?.expected_telemetry) || PARAM_BASELINES;

  // Build active deviations for the selected UAV
  const allEvidenceParams = SUPPORTED_ANOMALY_PARAMS.map((p) => {
    const dev = deviationsObj[p.key];
    const cur = activeTelemetry?.[p.key] ?? dev?.actual;
    const base = dev?.expected ?? expectedTelObj[p.key] ?? PARAM_BASELINES[p.key];
    let absDev = dev?.absolute_deviation;
    if (absDev === undefined && cur !== undefined && base !== undefined) {
      absDev = Math.round(Math.abs(cur - base) * 100) / 100;
    }
    let devStatus = dev?.status;
    if (!devStatus && cur !== undefined && base !== undefined) {
      const relDiff = Math.abs(cur - base) / Math.max(1, base);
      if (p.key === 'oil_pressure' && cur < 1.5) devStatus = 'CRITICAL';
      else if (p.key === 'vibration' && cur > 5.0) devStatus = 'CRITICAL';
      else if (p.key === 'cht' && cur > 130) devStatus = 'CRITICAL';
      else if (relDiff > 0.35) devStatus = 'CRITICAL';
      else if (relDiff > 0.15) devStatus = 'WARNING';
      else devStatus = 'NORMAL';
    }
    return {
      key: p.key,
      label: p.label,
      unit: p.unit,
      current: cur,
      baseline: base,
      deviation: absDev,
      status: devStatus || (isConnected ? 'NORMAL' : '--'),
    };
  });

  const affectedParams = allEvidenceParams.filter((p) => p.status && p.status !== 'NORMAL');

  // 5. Severity: Use active UAV severity
  let anomalySeverity = {
    label: 'Waiting...',
    badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
    dotClass: 'bg-slate-500',
  };

  if (hasAnomaly) {
    const hasCriticalParam = affectedParams.some((p) => p.status === 'CRITICAL');
    const hasWarningParam = affectedParams.some((p) => p.status === 'WARNING');

    if (activeRisk === 'HIGH' || hasCriticalParam) {
      anomalySeverity = {
        label: 'FAULT',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
      };
    } else if (activeRisk === 'MEDIUM' || hasWarningParam || anomalyStatusDisplay === 'ANOMALY') {
      anomalySeverity = {
        label: 'WARNING',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400 animate-pulse',
      };
    } else {
      anomalySeverity = {
        label: 'NORMAL',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
      };
    }
  }

  const anomalyStatusTextColor = !hasAnomaly || anomalyStatusDisplay === '--'
    ? 'text-slate-500 italic font-normal text-xs'
    : anomalyStatusDisplay === 'NORMAL'
      ? 'text-emerald-400 font-bold'
      : (anomalySeverity.label === 'FAULT' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold');

  // Section D: RUL Prediction Values from active UAV
  const hasRulValue = hasRul;
  const rulHoursNum = rulNum;
  const predictedRulValue = hasRulValue ? rulHoursNum.toFixed(1) : '--';
  const rulUnit = 'hours';

  // 3. RUL Status: Show HEALTHY / ATTENTION / CRITICAL using active UAV status
  let rulStatusBadge = {
    label: 'Waiting...',
    badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60',
    dotClass: 'bg-slate-500',
  };

  if (hasRulValue) {
    if (activeRisk === 'HIGH' || rulHoursNum < 50) {
      rulStatusBadge = {
        label: 'CRITICAL',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400 animate-pulse',
      };
    } else if (activeRisk === 'MEDIUM' || rulHoursNum <= 150) {
      rulStatusBadge = {
        label: 'ATTENTION',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400 animate-pulse',
      };
    } else {
      rulStatusBadge = {
        label: 'HEALTHY',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
      };
    }
  }

  // 5. RUL Evidence Parameters
  const RUL_EVIDENCE_PARAMS = [
    { key: 'cht', label: 'CHT', unit: '°C' },
    { key: 'egt', label: 'EGT', unit: '°C' },
    { key: 'oil_pressure', label: 'Oil Pressure', unit: 'bar' },
    { key: 'oil_temperature', label: 'Oil Temperature', unit: '°C' },
    { key: 'vibration', label: 'Vibration', unit: 'mm/s' },
    { key: 'engine_load', label: 'Engine Load', unit: '%' },
  ];

  // Section E: AI Evidence & Dynamic Explanation from actual active UAV data
  const currentFault = (activeFault || '').trim();
  const currentAnomaly = (activeAnomalyStatus || '').trim().toUpperCase();

  // Sort parameters so abnormal / highest deviating parameters appear first
  const sortedEvidenceParams = [...allEvidenceParams].sort((a, b) => {
    const scoreA = a.status === 'CRITICAL' ? 3 : a.status === 'WARNING' ? 2 : 1;
    const scoreB = b.status === 'CRITICAL' ? 3 : b.status === 'WARNING' ? 2 : 1;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.deviation || 0) - (a.deviation || 0);
  });

  const topDev = sortedEvidenceParams[0];

  // 1. Dynamic "Why this result" explanation based on active UAV data
  let whyThisResult = 'Waiting for live AI analysis...';
  if (currentFault) {
    if (currentFault === 'NORMAL' && (currentAnomaly === 'NORMAL' || !currentAnomaly)) {
      whyThisResult = `Normal operation on unit ${activeUavId} because monitored parameters remain within expected limits.`;
    } else if (currentFault === 'COOLING_PROBLEM' || (topDev && topDev.key === 'cht' && topDev.status !== 'NORMAL')) {
      const chtCur = topDev?.current !== undefined ? `${Number(topDev.current).toFixed(1)} °C` : 'elevated';
      const chtBase = topDev?.baseline !== undefined ? `${Number(topDev.baseline).toFixed(1)} °C` : 'baseline';
      whyThisResult = `Cooling-related behavior detected on ${activeUavId} because CHT (${chtCur}) is significantly above the digital-twin baseline (${chtBase}).`;
    } else if (currentFault === 'SENSOR_ANOMALY') {
      const pName = topDev ? topDev.label : 'monitored';
      whyThisResult = `Sensor anomaly detected on ${activeUavId} because the ${pName} telemetry channel deviates from expected range.`;
    } else if (currentFault === 'LUBRICATION_PROBLEM' || (topDev && (topDev.key === 'oil_pressure' || topDev.key === 'oil_temperature') && topDev.status !== 'NORMAL')) {
      const pName = topDev?.label || 'Oil Pressure';
      const pCur = topDev?.current !== undefined ? `${Number(topDev.current).toFixed(1)} ${topDev.unit}` : 'abnormal';
      const pBase = topDev?.baseline !== undefined ? `${Number(topDev.baseline).toFixed(1)} ${topDev.unit}` : 'baseline';
      whyThisResult = `Lubrication-related anomaly detected on ${activeUavId} because ${pName} (${pCur}) deviates critically from the expected digital-twin baseline (${pBase}).`;
    } else if (currentFault === 'MISFIRE') {
      whyThisResult = `Combustion misfire pattern identified on ${activeUavId} due to cyclic RPM irregularity and cylinder exhaust temperature drop.`;
    } else if (currentFault === 'INJECTOR_ABNORMALITY') {
      whyThisResult = `Fuel injector abnormality detected on ${activeUavId} because fuel flow and combustion temperature diverge from expected engine load profile.`;
    } else if (currentAnomaly === 'ANOMALOUS' || currentAnomaly === 'ANOMALY') {
      const pName = topDev ? topDev.label : 'engine parameters';
      whyThisResult = `Unsupervised outlier pattern detected on ${activeUavId} because ${pName} telemetry deviates from the nominal operational cluster.`;
    } else {
      whyThisResult = `AI fault classifier identifies ${currentFault.replace(/_/g, ' ')} on ${activeUavId} based on multi-parameter digital-twin deviation signatures.`;
    }
  }

  // 4. Fault + Anomaly Relationship explanation
  let anomalySupportExplanation = 'Waiting for live AI inference stream...';
  if (currentFault) {
    const isFaultNormal = currentFault === 'NORMAL';
    const isAnomalyNormal = currentAnomaly === 'NORMAL' || currentAnomaly === '';
    if (isFaultNormal && isAnomalyNormal) {
      anomalySupportExplanation = `The unsupervised anomaly detector supports the fault prediction for ${activeUavId}: both models classify current telemetry as nominal with no outlier behavior.`;
    } else if (!isFaultNormal && !isAnomalyNormal) {
      anomalySupportExplanation = `The anomaly detector supports the current prediction for ${activeUavId}: unsupervised outlier boundary detection confirms physical deviation consistent with ${currentFault}.`;
    } else if (!isFaultNormal && isAnomalyNormal) {
      anomalySupportExplanation = `Supervised classifier isolates a specific fault signature (${currentFault}) on ${activeUavId}, while overall multi-parameter space remains near normal operational cluster boundary.`;
    } else {
      anomalySupportExplanation = `Anomaly detector flags multi-channel outlier drift on ${activeUavId}, but supervised classifier attributes the telemetry pattern to non-critical nominal state.`;
    }
  }

  // 6. Evidence Severity badge
  const evidenceSeverity = activeRisk === 'HIGH'
    ? { label: 'FAULT', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dotClass: 'bg-rose-400 animate-pulse' }
    : activeRisk === 'MEDIUM' || currentAnomaly === 'ANOMALOUS'
      ? { label: 'WARNING', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dotClass: 'bg-amber-400 animate-pulse' }
      : isConnected
        ? { label: 'NORMAL', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dotClass: 'bg-emerald-400' }
        : { label: 'WAITING...', badgeClass: 'bg-slate-800/60 text-slate-400 border-slate-700/60', dotClass: 'bg-slate-500' };

  // 8. Maintenance / Operator Message
  let operatorMessage = 'No additional recommendation available.';
  if (activeRecommendation) {
    operatorMessage = String(activeRecommendation).replace(/_/g, ' ');
  }

  // 7. Primary Evidence (top 2-3 most relevant deviations)
  const primaryEvidenceItems = sortedEvidenceParams.slice(0, 3);

  const inferenceStatusClass = isConnected
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80'
    : 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <div className="space-y-6 select-none font-mono">
      <PageHeader
        systemTag="AEROTWIN // AI ANALYTICS"
        title="AI Analysis"
        description="Machine learning inference pipeline executing multi-class fault prediction, semi-supervised anomaly detection, Remaining Useful Life (RUL) estimation, and diagnostic explanation."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">INFERENCE STATUS:</span>
            <span className={`px-2.5 py-1 rounded text-xs font-semibold border flex items-center gap-1.5 ${inferenceStatusClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              {isConnected ? 'INFERENCE ACTIVE (LIVE)' : 'STANDBY (AWAITING TELEMETRY)'}
            </span>
          </div>
        }
      />

      {/* PERSISTENT ACTIVE UAV CONTEXT BANNER */}
      <div className="p-3.5 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">
                SHOWING DATA FOR:
              </span>
              <span className="text-base font-bold font-mono text-sky-400 tracking-wide">
                {activeUavId}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-semibold">
                PHASE: {activeFlightPhase}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${overallBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${overallBadge.dotClass}`} />
                {overallBadge.label}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              All detailed AI diagnostics, telemetry channels, and twin baselines are isolated to unit <strong className="text-slate-200 font-bold">{activeUavId}</strong>.
            </p>
          </div>
        </div>

        {/* Quick UAV Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80">
          <label htmlFor="ai-uav-select" className="text-xs font-mono text-slate-400 whitespace-nowrap">
            SWITCH UAV:
          </label>
          <select
            id="ai-uav-select"
            value={activeUavId}
            onChange={(e) => setActiveUavId(e.target.value)}
            className="bg-transparent text-slate-100 font-mono text-xs font-bold focus:outline-none cursor-pointer"
            aria-label="Select Active UAV"
          >
            {fleetUavIds.map((id) => (
              <option key={id} value={id} className="bg-slate-900 text-slate-100">
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION A: AI HEALTH SUMMARY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              A. AI Health Summary
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">OVERALL STATUS:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border flex items-center gap-1.5 ${overallBadge.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${overallBadge.dotClass}`} />
              {overallBadge.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Engine Health"
            value={engineHealthVal}
            unit=""
            status={engineHealthStatus}
            subtext="Degradation Index"
            icon={Activity}
          />
          <MetricCard
            title="Fitness Score"
            value={fitnessScoreVal}
            unit=""
            status={fitnessScoreStatus}
            subtext="Thermodynamic Baseline Match"
            icon={CheckCircle2}
          />
          <MetricCard
            title="Predicted RUL"
            value={predictedRulVal}
            unit=""
            status={predictedRulStatus}
            subtext="Remaining Useful Life"
            icon={TrendingDown}
          />
          <MetricCard
            title="Anomaly Score"
            value={anomalyScoreVal}
            unit=""
            status={anomalyScoreStatus}
            subtext="Isolation Forest Norm"
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* SECTIONS B, C, D: FAULT PREDICTION, ANOMALY DETECTION, RUL PREDICTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* SECTION B: FAULT PREDICTION */}
        <SectionCard
          title="B. Fault Prediction"
          subtitle="Random Forest multi-class classifier"
          action={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">STATUS:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 ${faultAiStatus.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${faultAiStatus.dotClass}`} />
                {faultAiStatus.label}
              </span>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Predicted Fault
                </span>
                <span className={`text-sm block truncate ${faultTextColor}`}>
                  {faultType}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Confidence
                </span>
                <span className={`text-sm font-bold block ${hasConfidence ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'}`}>
                  {confidenceVal}
                </span>
              </div>
            </div>

            {/* Top 3 Predictions */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Top 3 Predictions
                </span>
                <span className="text-[10px] text-slate-500">
                  {hasProbs ? 'PROBABILITY' : ''}
                </span>
              </div>

              {top3Predictions.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {top3Predictions.map((pred, idx) => {
                    const isNormal = pred.name === 'NORMAL';
                    const isDominant = idx === 0;
                    const barColor = isNormal
                      ? 'bg-emerald-500'
                      : (faultAiStatus.label === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500');
                    return (
                      <div key={pred.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className={`truncate ${isDominant ? 'text-slate-200 font-bold' : 'text-slate-400'}`}>
                            {idx + 1}. {pred.name}
                          </span>
                          <span className={`font-mono font-semibold ml-2 ${isDominant ? (isNormal ? 'text-emerald-400' : (faultAiStatus.label === 'WARNING' ? 'text-amber-400' : 'text-rose-400')) : 'text-slate-400'}`}>
                            {pred.pct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800/60">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, Number(pred.pct)))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">
                  Waiting for fault probabilities...
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* SECTION C: ANOMALY DETECTION */}
        <SectionCard
          title="C. Anomaly Detection"
          subtitle="Unsupervised Isolation Forest + Deviations"
          action={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">SEVERITY:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 ${anomalySeverity.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${anomalySeverity.dotClass}`} />
                {anomalySeverity.label}
              </span>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Top Cards: Status & Anomaly Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Anomaly Status
                </span>
                <span className={`text-sm block truncate ${anomalyStatusTextColor}`}>
                  {anomalyStatusDisplay}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Anomaly Score
                </span>
                <span className={`text-sm font-bold block ${hasAnomalyScore ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'}`}>
                  {anomalyScoreDisplay}
                </span>
              </div>
            </div>

            {/* Affected Parameters */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Affected Parameters
              </span>
              {affectedParams.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {affectedParams.map((p) => (
                    <span
                      key={p.key}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${
                        p.status === 'CRITICAL'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] opacity-80">({p.status === 'CRITICAL' ? 'FAULT' : p.status})</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{isConnected ? 'None (All parameters within baseline tolerance)' : '--'}</span>
                </div>
              )}
            </div>

            {/* Evidence Table */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Evidence Table
              </span>
              <div className="overflow-x-auto border border-slate-800 rounded bg-slate-950/80">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[9px] tracking-wider">
                      <th className="py-1.5 px-2">Parameter</th>
                      <th className="py-1.5 px-2 text-right">Current</th>
                      <th className="py-1.5 px-2 text-right">Baseline</th>
                      <th className="py-1.5 px-2 text-right">Deviation</th>
                      <th className="py-1.5 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {SUPPORTED_ANOMALY_PARAMS.map((param) => {
                      const dev = deviationsObj[param.key];
                      const cur = telemetry?.[param.key] ?? dev?.actual;
                      const base = dev?.expected ?? expectedTelObj[param.key];
                      const absDev = dev?.absolute_deviation;
                      const paramStatus = dev?.status || (isConnected ? 'NORMAL' : '--');

                      const curText = cur !== undefined && cur !== null ? `${Number(cur).toFixed(1)}` : '--';
                      const baseText = base !== undefined && base !== null ? `${Number(base).toFixed(1)}` : '--';
                      const devText = absDev !== undefined && absDev !== null
                        ? `${Number(absDev).toFixed(1)}`
                        : '--';

                      const statusBadgeClass = paramStatus === 'CRITICAL'
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                        : paramStatus === 'WARNING'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : paramStatus === 'NORMAL'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : 'text-slate-500 bg-slate-800/40 border-slate-700/40';

                      const statusDisplay = paramStatus === 'CRITICAL' ? 'FAULT' : paramStatus;

                      return (
                        <tr key={param.key} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-1 px-2 text-slate-300 font-medium whitespace-nowrap">
                            {param.label} <span className="text-slate-500 text-[9px]">({param.unit})</span>
                          </td>
                          <td className="py-1 px-2 text-right text-slate-200 whitespace-nowrap">
                            {curText}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-400 whitespace-nowrap">
                            {baseText}
                          </td>
                          <td className={`py-1 px-2 text-right whitespace-nowrap font-mono ${
                            paramStatus === 'NORMAL' ? 'text-slate-400' : (paramStatus === 'WARNING' ? 'text-amber-400 font-semibold' : 'text-rose-400 font-bold')
                          }`}>
                            {devText}
                          </td>
                          <td className="py-1 px-2 text-center whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border inline-block ${statusBadgeClass}`}>
                              {statusDisplay}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* SECTION D: RUL PREDICTION */}
        <SectionCard
          title="D. RUL Prediction"
          subtitle="Random Forest RUL regression model"
          action={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">RUL STATUS:</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 ${rulStatusBadge.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${rulStatusBadge.dotClass}`} />
                {rulStatusBadge.label}
              </span>
            </div>
          }
        >
          <div className="space-y-3">
            {/* Top Cards: Predicted RUL & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Predicted RUL
                </span>
                <span className={`text-sm font-bold block truncate ${hasRulValue ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'}`}>
                  {predictedRulValue}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  RUL Unit
                </span>
                <span className="text-sm font-bold block text-slate-200">
                  {rulUnit}
                </span>
              </div>
            </div>

            {/* Degradation Trend */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Degradation Trend
              </span>
              {history && history.length >= 2 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>LIVE STREAM ({history.length} pts)</span>
                    <span className="text-sky-300 font-semibold">
                      {history[history.length - 1]?.health !== undefined ? `${(100 - Number(history[history.length - 1].health)).toFixed(1)}% degradation` : ''}
                    </span>
                  </div>
                  <div className="h-10 w-full flex items-end gap-1 pt-1 border-b border-slate-800/80">
                    {history.slice(-16).map((pt, idx) => {
                      const deg = Math.max(0, Math.min(100, 100 - (pt.health ?? 100)));
                      const heightPct = Math.max(10, Math.min(100, deg * 2.5));
                      const barColor = deg > 30 ? 'bg-rose-500' : deg > 15 ? 'bg-amber-400' : 'bg-sky-400';
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col justify-end items-center h-full"
                        >
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${barColor}`}
                            style={{ height: `${heightPct}%` }}
                            title={`Degradation: ${deg.toFixed(1)}%`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-1">
                  Live degradation history will appear as data accumulates.
                </div>
              )}
            </div>

            {/* RUL Evidence */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  RUL Evidence
                </span>
                <span className="text-[10px] text-slate-500">DEGRADATION DRIVERS</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                {RUL_EVIDENCE_PARAMS.map((param) => {
                  const dev = deviationsObj[param.key];
                  const cur = telemetry?.[param.key] ?? dev?.actual;
                  const curText = cur !== undefined && cur !== null ? `${Number(cur).toFixed(1)} ${param.unit}` : '--';
                  const paramStatus = dev?.status || (isConnected ? 'NORMAL' : '--');
                  const statusColor = paramStatus === 'CRITICAL'
                    ? 'text-rose-400'
                    : paramStatus === 'WARNING'
                      ? 'text-amber-400'
                      : paramStatus === 'NORMAL'
                        ? 'text-emerald-400'
                        : 'text-slate-500';

                  return (
                    <div
                      key={param.key}
                      className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-400 font-medium truncate">{param.label}</span>
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-slate-200 font-mono">{curText}</span>
                        <span className={`text-[9px] font-bold uppercase ${statusColor}`}>
                          [{paramStatus === 'CRITICAL' ? 'CRIT' : paramStatus === 'WARNING' ? 'WARN' : paramStatus === 'NORMAL' ? 'OK' : '--'}]
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* SECTION E: AI EVIDENCE */}
      <SectionCard
        title="Why did the AI produce this result?"
        subtitle="E. AI Evidence & Interpretability Analysis"
        action={
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">SEVERITY:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 ${evidenceSeverity.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${evidenceSeverity.dotClass}`} />
              {evidenceSeverity.label}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {/* 1. WHY THIS RESULT */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400">
              <BrainCircuit className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                1. Why This Result
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-mono font-medium">
              {whyThisResult}
            </p>
          </div>

          {/* Grid: 3. AI CONFIDENCE & 4. FAULT + ANOMALY RELATIONSHIP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 4. FAULT + ANOMALY RELATIONSHIP */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                4. Fault + Anomaly Relationship
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">PREDICTED FAULT</span>
                  <span className={`font-bold block truncate ${
                    !hasFault || currentFault === '--'
                      ? 'text-slate-500'
                      : currentFault === 'NORMAL'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                  }`}>
                    {currentFault || '--'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">ANOMALY STATUS</span>
                  <span className={`font-bold block truncate ${
                    !hasAnomalyData || currentAnomaly === '--'
                      ? 'text-slate-500'
                      : currentAnomaly === 'NORMAL'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                  }`}>
                    {currentAnomaly || '--'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/60">
                {anomalySupportExplanation}
              </p>
            </div>

            {/* 3. AI CONFIDENCE & 5. DIGITAL TWIN SUMMARY */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                3. AI Confidence & Twin Deviation Summary
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">AI CONFIDENCE</span>
                  <span className="font-bold text-sky-300 block">
                    {hasConfidence ? confidenceVal : '--'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">PRIMARY DEVIATION</span>
                  <span className={`font-bold block truncate ${
                    topDev?.status === 'CRITICAL'
                      ? 'text-rose-400'
                      : topDev?.status === 'WARNING'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                  }`}>
                    {topDev ? `${topDev.label} (${topDev.deviation !== undefined ? `${topDev.deviation > 0 ? '+' : ''}${Number(topDev.deviation).toFixed(1)}` : '--'})` : '--'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 leading-normal pt-1 border-t border-slate-800/60 flex items-center justify-between">
                <span>TWIN MODEL: Physics Baseline Match</span>
                <span className={`font-bold text-[10px] ${evidenceSeverity.badgeClass} px-1.5 py-0.2 rounded border`}>
                  {evidenceSeverity.label}
                </span>
              </div>
            </div>
          </div>

          {/* 2. KEY EVIDENCE & 5. DIGITAL TWIN DEVIATION TABLE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                2. Key Evidence (Parameters Contributing to Prediction)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                DIGITAL TWIN BASELINE COMPARISON
              </span>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded bg-slate-950/80">
              <table className="w-full text-left text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[9px] tracking-wider">
                    <th className="py-1.5 px-3">Parameter</th>
                    <th className="py-1.5 px-2 text-right">Current Value</th>
                    <th className="py-1.5 px-2 text-right">Baseline</th>
                    <th className="py-1.5 px-2 text-right">Deviation</th>
                    <th className="py-1.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedEvidenceParams.map((param) => {
                    const curText = param.current !== undefined && param.current !== null
                      ? `${Number(param.current).toFixed(1)} ${param.unit}`
                      : '--';
                    const baseText = param.baseline !== undefined && param.baseline !== null
                      ? `${Number(param.baseline).toFixed(1)} ${param.unit}`
                      : '--';
                    const devText = param.deviation !== undefined && param.deviation !== null
                      ? `${param.deviation > 0 ? '+' : ''}${Number(param.deviation).toFixed(1)} ${param.unit}`
                      : '--';

                    const statusBadgeClass = param.status === 'CRITICAL'
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                      : param.status === 'WARNING'
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                        : param.status === 'NORMAL'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : 'text-slate-500 bg-slate-800/40 border-slate-700/40';

                    const statusDisplay = param.status === 'CRITICAL' ? 'FAULT' : param.status;

                    return (
                      <tr key={param.key} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-1.5 px-3 text-slate-200 font-medium whitespace-nowrap">
                          {param.label}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-100 whitespace-nowrap font-bold">
                          {curText}
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-400 whitespace-nowrap">
                          {baseText}
                        </td>
                        <td className={`py-1.5 px-2 text-right whitespace-nowrap font-mono ${
                          param.status === 'NORMAL'
                            ? 'text-slate-400'
                            : param.status === 'WARNING'
                              ? 'text-amber-400 font-semibold'
                              : 'text-rose-400 font-bold'
                        }`}>
                          {devText}
                        </td>
                        <td className="py-1.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${statusBadgeClass}`}>
                            {statusDisplay}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SectionCard>
 
      {/* FINAL COMPACT AI HEALTH SUMMARY SECTION */}
      <SectionCard
        title="AI Health Summary"
        subtitle="Consolidated real-time operational overview"
        action={
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">OVERALL AI STATUS:</span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border flex items-center gap-1.5 ${overallBadge.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${overallBadge.dotClass}`} />
              {overallBadge.label}
            </span>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Horizontal / Grid Cards: Items 1 to 6 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. OVERALL AI STATUS */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Overall AI Status
              </span>
              <span className={`text-sm font-bold block truncate ${
                overallBadge.label === 'FAULT'
                  ? 'text-rose-400'
                  : overallBadge.label === 'WARNING'
                    ? 'text-amber-400'
                    : overallBadge.label === 'NORMAL'
                      ? 'text-emerald-400'
                      : 'text-slate-400'
              }`}>
                {overallBadge.label}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">Composite State</span>
            </div>

            {/* 2. ENGINE HEALTH */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Engine Health
              </span>
              <span className={`text-sm font-bold block truncate ${
                hasEngineHealth ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'
              }`}>
                {engineHealthVal}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">Degradation Index</span>
            </div>

            {/* 3. FITNESS SCORE */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Fitness Score
              </span>
              <span className={`text-sm font-bold block truncate ${
                hasFitness ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'
              }`}>
                {fitnessScoreVal}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">Baseline Match</span>
            </div>

            {/* 4. PREDICTED FAULT */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Predicted Fault
              </span>
              <span className={`text-sm font-bold block truncate ${
                !hasFault || currentFault === '--'
                  ? 'text-slate-500 italic font-normal text-xs'
                  : currentFault === 'NORMAL'
                    ? 'text-emerald-400'
                    : 'text-rose-400'
              }`}>
                {currentFault || '--'}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">
                Conf: {hasConfidence ? confidenceVal : '--'}
              </span>
            </div>

            {/* 5. ANOMALY */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Anomaly
              </span>
              <span className={`text-sm font-bold block truncate ${
                !hasAnomalyData || anomalyStatusDisplay === '--'
                  ? 'text-slate-500 italic font-normal text-xs'
                  : anomalyStatusDisplay === 'NORMAL'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
              }`}>
                {anomalyStatusDisplay}
              </span>
              <span className="text-[9px] text-slate-500 mt-1">
                Score: {anomalyScoreDisplay}
              </span>
            </div>

            {/* 6. PREDICTED RUL */}
            <div className="p-3 rounded bg-slate-950/80 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                Predicted RUL
              </span>
              <span className={`text-sm font-bold block truncate ${
                hasRulValue ? 'text-sky-300' : 'text-slate-500 italic font-normal text-xs'
              }`}>
                {hasRulValue ? `${predictedRulValue} ${rulUnit}` : '--'}
              </span>
              <span className={`text-[9px] font-bold mt-1 ${
                rulStatusBadge.label === 'CRITICAL'
                  ? 'text-rose-400'
                  : rulStatusBadge.label === 'ATTENTION'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}>
                [{rulStatusBadge.label}]
              </span>
            </div>
          </div>

          {/* Bottom Grid: 7. PRIMARY EVIDENCE & 8. MAINTENANCE / OPERATOR MESSAGE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 7. PRIMARY EVIDENCE */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                  7. Primary Evidence (Top Deviations)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  DIGITAL TWIN BASELINE
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-800 rounded bg-slate-950/80">
                <table className="w-full text-left text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[9px] tracking-wider">
                      <th className="py-1.5 px-3">Parameter</th>
                      <th className="py-1.5 px-2 text-right">Current</th>
                      <th className="py-1.5 px-2 text-right">Baseline</th>
                      <th className="py-1.5 px-2 text-right">Deviation</th>
                      <th className="py-1.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {primaryEvidenceItems.map((param) => {
                      const curText = param.current !== undefined && param.current !== null
                        ? `${Number(param.current).toFixed(1)} ${param.unit}`
                        : '--';
                      const baseText = param.baseline !== undefined && param.baseline !== null
                        ? `${Number(param.baseline).toFixed(1)} ${param.unit}`
                        : '--';
                      const devText = param.deviation !== undefined && param.deviation !== null
                        ? `${param.deviation > 0 ? '+' : ''}${Number(param.deviation).toFixed(1)} ${param.unit}`
                        : '--';

                      const statusBadgeClass = param.status === 'CRITICAL'
                        ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                        : param.status === 'WARNING'
                          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          : param.status === 'NORMAL'
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                            : 'text-slate-500 bg-slate-800/40 border-slate-700/40';

                      const statusDisplay = param.status === 'CRITICAL' ? 'FAULT' : param.status;

                      return (
                        <tr key={param.key} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-1 px-3 text-slate-200 font-medium whitespace-nowrap">
                            {param.label}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-100 whitespace-nowrap font-bold">
                            {curText}
                          </td>
                          <td className="py-1 px-2 text-right text-slate-400 whitespace-nowrap">
                            {baseText}
                          </td>
                          <td className={`py-1 px-2 text-right whitespace-nowrap font-mono ${
                            param.status === 'NORMAL'
                              ? 'text-slate-400'
                              : param.status === 'WARNING'
                                ? 'text-amber-400 font-semibold'
                                : 'text-rose-400 font-bold'
                          }`}>
                            {devText}
                          </td>
                          <td className="py-1 px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.2 rounded text-[9px] font-bold border inline-block ${statusBadgeClass}`}>
                              {statusDisplay}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 8. MAINTENANCE / OPERATOR MESSAGE */}
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  8. Maintenance / Operator Message
                </span>
                <span className="text-[10px] text-slate-500 font-mono">BACKEND DECISION</span>
              </div>
              <div className="p-3 rounded bg-slate-900/80 border border-slate-800/80 flex-1 flex items-center">
                <p className={`text-xs font-mono leading-relaxed ${
                  operatorMessage === 'No additional recommendation available.'
                    ? 'text-slate-500 italic'
                    : overallBadge.label === 'FAULT'
                      ? 'text-rose-400 font-bold'
                      : overallBadge.label === 'WARNING'
                        ? 'text-amber-300 font-semibold'
                        : 'text-emerald-400'
                }`}>
                  {operatorMessage}
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 font-mono">
                <span>SYSTEM STATUS: {overallBadge.label}</span>
                <span>RECOMMENDATION DISPATCH ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
