import React from 'react';
import PageHeader from '../components/PageHeader';
import RiskBadge from '../components/RiskBadge';
import { useFleet } from '../hooks/useFleet';
import {
  Plane,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Layers,
  Clock,
  Shield,
  Radio,
  Check,
  ShieldAlert,
} from 'lucide-react';

/**
 * Determine primary health/risk status category for each UAV
 *
 * Classification rules:
 *
 * FAULT / HIGH RISK:
 * - Engine Health < 60%
 * - OR Mission Risk = HIGH
 *
 * HEALTHY:
 * - Engine Health >= 80%
 * - AND Mission Risk = LOW
 *
 * WARNING:
 * - Engine Health >= 60% and < 80%
 * - OR Mission Risk = MEDIUM
 * (and any other intermediate state not qualifying as FAULT or HEALTHY)
 *
 * Note: Predicted Fault alone must NOT automatically classify a UAV as FAULT/HIGH RISK.
 */
export function getUavStatusCategory(uav) {
  if (!uav) return 'UNKNOWN';
  const health = Number(uav.engine_health ?? 100);
  const risk = (uav.mission_risk || '').toUpperCase();

  // 1. FAULT / HIGH RISK: Engine Health < 60% OR Mission Risk = HIGH (or CRITICAL)
  if (health < 60 || risk === 'HIGH' || risk === 'CRITICAL') {
    return 'FAULT'; // Red
  }

  // 2. HEALTHY: Engine Health >= 80% AND Mission Risk = LOW
  if (health >= 80 && risk === 'LOW') {
    return 'HEALTHY'; // Green
  }

  // 3. WARNING: Engine Health >= 60% and < 80% OR Mission Risk = MEDIUM
  return 'WARNING'; // Yellow
}

/**
 * Generate human-readable risk reason grounded strictly in actual backend telemetry & AI evidence
 */
export function getUavRiskReason(uav) {
  if (!uav) return 'Awaiting telemetry telemetry';
  const health = Number(uav.engine_health ?? 100);
  const fault = (uav.predicted_fault || 'NORMAL').replace(/_/g, ' ');
  const rawRul = uav.predicted_rul ?? uav.predicted_rul_hours;
  const rul = rawRul !== undefined && rawRul !== null ? Number(rawRul) : null;
  const tel = uav.engine_telemetry || {};

  const reasons = [];

  // 1. Health evidence
  if (health < 40) {
    reasons.push(`Critical engine degradation (${health.toFixed(1)}% health)`);
  } else if (health < 60) {
    reasons.push(`Low engine health (${health.toFixed(1)}%)`);
  } else if (health < 80) {
    reasons.push(`Moderate engine degradation (${health.toFixed(1)}% health)`);
  }

  // 2. Sensor deviations
  if (tel.oil_pressure !== undefined && tel.oil_pressure < 1.2) {
    reasons.push(`Critical oil pressure drop (${tel.oil_pressure.toFixed(2)} bar)`);
  } else if (tel.oil_pressure !== undefined && tel.oil_pressure < 2.0) {
    reasons.push(`Low lubrication pressure (${tel.oil_pressure.toFixed(2)} bar)`);
  }

  if (tel.cht !== undefined && tel.cht > 140) {
    reasons.push(`Severe thermal residual (CHT ${tel.cht.toFixed(1)}°C)`);
  } else if (tel.cht !== undefined && tel.cht > 125) {
    reasons.push(`Elevated CHT (${tel.cht.toFixed(1)}°C)`);
  }

  if (tel.vibration !== undefined && tel.vibration > 6.0) {
    reasons.push(`Excessive chassis vibration (${tel.vibration.toFixed(1)} g)`);
  } else if (tel.vibration !== undefined && tel.vibration > 4.0) {
    reasons.push(`Elevated vibration (${tel.vibration.toFixed(1)} g)`);
  }

  // 3. RUL evidence
  if (rul !== null && rul < 150) {
    reasons.push(`Low remaining useful life (${rul.toFixed(0)} hrs)`);
  } else if (rul !== null && rul < 400) {
    reasons.push(`Reduced RUL (${rul.toFixed(0)} hrs)`);
  }

  // 4. Fault classification
  if (fault !== 'NORMAL' && fault !== 'UNKNOWN') {
    reasons.push(`AI detected ${fault}`);
  }

  // 5. Anomaly status
  if (uav.anomaly_status === 'ANOMALOUS' && uav.anomaly_score !== undefined) {
    reasons.push(`Anomaly score ${Number(uav.anomaly_score).toFixed(3)}`);
  }

  if (reasons.length === 0) {
    return 'Nominal physical propulsion baseline. Monitored channels within envelope.';
  }

  return reasons.slice(0, 3).join(' • ');
}

export default function FleetPage() {
  const {
    activeUavId,
    setActiveUavId,
    activeUavState,
    fleetData,
    uavs,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    refreshFleet,
    fleetUavIds,
  } = useFleet();

  // Compute fleet aggregation counts
  const totalCount = uavs.length;
  let healthyCount = 0;
  let warningCount = 0;
  let faultCount = 0;

  uavs.forEach((uav) => {
    const cat = getUavStatusCategory(uav);
    if (cat === 'HEALTHY') healthyCount++;
    else if (cat === 'WARNING') warningCount++;
    else if (cat === 'FAULT') faultCount++;
  });

  // Overall Fleet Risk determination
  let overallFleetRisk = 'LOW';
  let overallRiskBadgeClass = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80';
  let overallRiskDotClass = 'bg-emerald-400';
  let overallRiskDescription = 'All active units operating within nominal risk thresholds.';

  if (faultCount > 0) {
    overallFleetRisk = 'HIGH';
    overallRiskBadgeClass = 'bg-rose-950/60 text-rose-400 border-rose-800/80';
    overallRiskDotClass = 'bg-rose-400 animate-pulse';
    overallRiskDescription = `${faultCount} unit${faultCount > 1 ? 's' : ''} at high risk threshold requiring immediate supervisory intervention.`;
  } else if (warningCount > 0) {
    overallFleetRisk = 'MEDIUM';
    overallRiskBadgeClass = 'bg-amber-950/60 text-amber-400 border-amber-800/80';
    overallRiskDotClass = 'bg-amber-400 animate-pulse';
    overallRiskDescription = `${warningCount} unit${warningCount > 1 ? 's' : ''} with moderate risk/wear under observation.`;
  }

  // Filter & sort "UAVs Requiring Attention" (sorted by risk severity: FAULT first, then WARNING)
  const attentionUavs = [...uavs]
    .filter((u) => getUavStatusCategory(u) !== 'HEALTHY')
    .sort((a, b) => {
      const catA = getUavStatusCategory(a);
      const catB = getUavStatusCategory(b);
      if (catA === 'FAULT' && catB !== 'FAULT') return -1;
      if (catA !== 'FAULT' && catB === 'FAULT') return 1;
      // Secondary sort: lower engine health first
      return Number(a.engine_health ?? 100) - Number(b.engine_health ?? 100);
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        systemTag="AEROTWIN // FLEET OPS"
        title="Fleet Overview & Risk Management"
        description="Synchronized multi-UAV operational status, fleet-level risk assessment, live telemetry tracking, and predictive AI diagnostics across all fleet units."
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refreshFleet(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isRefreshing ? 'SYNCING...' : 'REFRESH'}</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE REFRESH: 2.5s</span>
            </div>
          </div>
        }
      />

      {/* Simulated Telemetry Banner */}
      <div className="px-3.5 py-2 rounded bg-sky-950/30 border border-sky-800/40 text-[11px] font-mono text-sky-300 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400 shrink-0" />
          <span>DATA MODE: SIMULATED BACKEND TELEMETRY</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">ENDPOINT: /api/uav/all</span>
        </div>
        {lastUpdated && (
          <div className="text-slate-400 text-[10px]">
            LAST SYNC: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Active UAV Banner */}
      <div className="p-3.5 rounded-lg bg-[#0e1422]/95 border border-slate-700/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider">
                ACTIVE UAV:
              </span>
              <span className="text-base md:text-lg font-bold font-mono text-sky-400 tracking-wide">
                {activeUavId}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold tracking-wider inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ACTIVE UNIT
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 mt-0.5">
              Phase: <span className="text-sky-300 font-semibold">{activeUavState?.flight_phase || 'CRUISE'}</span>
              {' • '}Health: <span className={`font-semibold ${
                Number(activeUavState?.engine_health) < 60 ? 'text-rose-400' :
                Number(activeUavState?.engine_health) < 80 ? 'text-amber-400' : 'text-emerald-400'
              }`}>{activeUavState?.engine_health !== undefined ? Number(activeUavState.engine_health).toFixed(1) + '%' : '--'}</span>
              {' • '}Fitness: <span className="text-slate-200 font-semibold">{activeUavState?.fitness_score !== undefined ? Number(activeUavState.fitness_score).toFixed(1) + '%' : '--'}</span>
              {' • '}RUL: <span className="text-sky-300 font-semibold">{(activeUavState?.predicted_rul ?? activeUavState?.predicted_rul_hours) !== undefined ? Number(activeUavState?.predicted_rul ?? activeUavState?.predicted_rul_hours).toFixed(1) + ' hrs' : '--'}</span>
              {' • '}Risk: <span className="font-semibold text-amber-400">{activeUavState?.mission_risk || 'LOW'}</span>
              {' • '}Fault: <span className="font-semibold text-slate-200">{(activeUavState?.predicted_fault || 'NORMAL').replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>

        {/* Compact UAV Selector Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-900 px-2.5 py-1 rounded border border-slate-700/80">
          <label htmlFor="active-uav-select" className="text-xs font-mono text-slate-400 whitespace-nowrap">
            SWITCH UAV:
          </label>
          <select
            id="active-uav-select"
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

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend Communication Failure</p>
            <p className="text-rose-400/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 1. FLEET RISK SUMMARY SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
              Fleet Risk Summary
            </h2>
          </div>
          <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border inline-flex items-center gap-1.5 ${overallRiskBadgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${overallRiskDotClass}`} />
            OVERALL FLEET RISK: {overallFleetRisk}
          </span>
        </div>

        {/* Fleet Overview Header Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total UAVs */}
          <div className="p-4 rounded-lg bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-mono font-semibold tracking-wider">TOTAL FLEET</span>
              <Layers className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-100">
                {loading && totalCount === 0 ? '--' : totalCount}
              </span>
              <span className="text-[10px] font-mono text-slate-500">ACTIVE UNITS</span>
            </div>
          </div>

          {/* Healthy UAVs */}
          <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-mono font-semibold tracking-wider">HEALTHY</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-300">
                {loading && totalCount === 0 ? '--' : healthyCount}
              </span>
              <span className="text-[10px] font-mono text-emerald-500/80">LOW RISK</span>
            </div>
          </div>

          {/* Warning UAVs */}
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[11px] font-mono font-semibold tracking-wider">WARNING</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-300">
                {loading && totalCount === 0 ? '--' : warningCount}
              </span>
              <span className="text-[10px] font-mono text-amber-500/80">MODERATE RISK</span>
            </div>
          </div>

          {/* Fault/High Risk UAVs */}
          <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-900/40 flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-400">
              <span className="text-[11px] font-mono font-semibold tracking-wider">HIGH RISK / FAULT</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-rose-300">
                {loading && totalCount === 0 ? '--' : faultCount}
              </span>
              <span className="text-[10px] font-mono text-rose-500/80">ATTENTION REQ</span>
            </div>
          </div>
        </div>

        {/* Overall Fleet Status Banner */}
        <div className="px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">FLEET RISK ADVISORY:</span>
            <span className="text-slate-200 font-semibold">{overallRiskDescription}</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            TOTAL ({totalCount}) = HEALTHY ({healthyCount}) + WARNING ({warningCount}) + HIGH RISK ({faultCount})
          </span>
        </div>
      </div>

      {/* 2. UAVs REQUIRING ATTENTION SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
              UAVs Requiring Attention ({attentionUavs.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Sorted by risk severity & engine degradation
          </span>
        </div>

        {attentionUavs.length === 0 ? (
          <div className="p-6 rounded-lg bg-emerald-950/10 border border-emerald-900/30 text-center text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>All fleet units operating within nominal risk thresholds. No supervisory escalation required.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionUavs.map((uav) => {
              const cat = getUavStatusCategory(uav);
              const isSelected = activeUavId === uav.uav_id;
              const reason = getUavRiskReason(uav);
              const risk = (uav.mission_risk || 'LOW').toUpperCase();
              const health = Number(uav.engine_health ?? 100);

              return (
                <div
                  key={`attention-${uav.uav_id}`}
                  onClick={() => setActiveUavId(uav.uav_id)}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    cat === 'FAULT'
                      ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700'
                      : 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700'
                  } ${isSelected ? 'ring-2 ring-sky-400' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-white">
                        {uav.uav_id}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400 text-[9px] font-mono font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <RiskBadge level={risk} />
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950/50 p-2 rounded border border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block">HEALTH</span>
                      <span className={`font-bold ${health < 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {health.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">RUL</span>
                      <span className="font-bold text-slate-200">
                        {(uav.predicted_rul ?? uav.predicted_rul_hours) !== undefined ? `${Number(uav.predicted_rul ?? uav.predicted_rul_hours).toFixed(0)} hrs` : '--'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">FAULT</span>
                      <span className="font-bold text-slate-300 truncate block">
                        {(uav.predicted_fault || 'NORMAL').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Risk Reason */}
                  <div className="text-[11px] font-mono">
                    <span className="text-slate-400 font-semibold block mb-0.5">PRIMARY RISK EVIDENCE:</span>
                    <span className={cat === 'FAULT' ? 'text-rose-300' : 'text-amber-300'}>
                      {reason}
                    </span>
                  </div>

                  {/* Recommendation & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] font-mono">
                    <span className="text-slate-400">
                      ADVISORY: <span className="text-slate-200 font-semibold">{(uav.recommendation || 'CONTINUE_MISSION').replace(/_/g, ' ')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveUavId(uav.uav_id);
                      }}
                      className="px-2 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-700 text-sky-300 font-bold"
                    >
                      {isSelected ? 'SELECTED' : 'SELECT UAV'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. RISK BY UAV BREAKDOWN TABLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-slate-300 uppercase">
              Risk by UAV (Complete Fleet Breakdown)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Click any row to set as active UAV
          </span>
        </div>

        <div className="rounded-lg bg-slate-900/60 border border-slate-800 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">UAV ID</th>
                  <th className="py-2.5 px-3 font-semibold">ENGINE HEALTH</th>
                  <th className="py-2.5 px-3 font-semibold">MISSION RISK</th>
                  <th className="py-2.5 px-3 font-semibold">PREDICTED RUL</th>
                  <th className="py-2.5 px-3 font-semibold">PREDICTED FAULT</th>
                  <th className="py-2.5 px-4 font-semibold">RISK REASON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {uavs.map((uav) => {
                  const isSelected = activeUavId === uav.uav_id;
                  const cat = getUavStatusCategory(uav);
                  const health = Number(uav.engine_health ?? 100);
                  const risk = (uav.mission_risk || 'LOW').toUpperCase();
                  const rawRul = uav.predicted_rul ?? uav.predicted_rul_hours;
                  const rulStr = rawRul !== undefined && rawRul !== null ? `${Number(rawRul).toFixed(1)} hrs` : '--';
                  const faultStr = (uav.predicted_fault || 'NORMAL').replace(/_/g, ' ');
                  const reason = getUavRiskReason(uav);

                  return (
                    <tr
                      key={`table-${uav.uav_id}`}
                      onClick={() => setActiveUavId(uav.uav_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-950/40 text-white font-semibold'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-2">
                        <span className="font-bold text-slate-100">{uav.uav_id}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400 text-[9px] font-bold">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={health < 60 ? 'text-rose-400 font-bold' : health < 80 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {health.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <RiskBadge level={risk} />
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {rulStr}
                      </td>
                      <td className="py-3 px-3">
                        <span className={faultStr === 'NORMAL' ? 'text-emerald-400' : 'text-amber-300'}>
                          {faultStr}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate">
                        {reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. UAV FLEET CARDS SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold font-mono text-slate-200 tracking-wider">
              FLEET UNITS ({uavs.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Click any card to set as ACTIVE UAV
          </span>
        </div>

        {loading && !fleetData ? (
          <div className="p-12 text-center rounded-lg bg-slate-900/40 border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mx-auto mb-2" />
            <p className="text-xs font-mono text-slate-400">Loading simulated fleet telemetry from backend...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uavs.map((uav) => {
              const uavId = uav.uav_id || 'UNKNOWN';
              const isSelected = activeUavId === uavId;
              const statusCat = getUavStatusCategory(uav);

              // Status styles: Green / Yellow / Red
              let statusBadgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              let statusDot = 'bg-emerald-400';
              let statusLabel = 'HEALTHY';

              if (statusCat === 'WARNING') {
                statusBadgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                statusDot = 'bg-amber-400';
                statusLabel = 'WARNING';
              } else if (statusCat === 'FAULT') {
                statusBadgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                statusDot = 'bg-rose-400';
                statusLabel = 'FAULT';
              }

              const engineHealthVal = uav.engine_health !== undefined && uav.engine_health !== null
                ? Number(uav.engine_health).toFixed(1)
                : '--';
              const fitnessVal = uav.fitness_score !== undefined && uav.fitness_score !== null
                ? Number(uav.fitness_score).toFixed(1)
                : '--';
              const rawRul = uav.predicted_rul ?? uav.predicted_rul_hours;
              const rulVal = rawRul !== undefined && rawRul !== null
                ? `${Number(rawRul).toFixed(1)} hrs`
                : '--';
              const flightPhase = uav.flight_phase || 'CRUISE';
              const faultName = (uav.predicted_fault || 'NORMAL').replace(/_/g, ' ');
              const missionRisk = uav.mission_risk || 'LOW';

              return (
                <div
                  key={uavId}
                  id={`uav-card-${uavId}`}
                  onClick={() => setActiveUavId(uavId)}
                  className={`relative p-4 rounded-lg border transition-colors duration-150 cursor-pointer flex flex-col justify-between shadow-sm ${
                    isSelected
                      ? 'bg-[#11192e] border-sky-400/90'
                      : 'bg-[#0e1422]/90 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                >
                  {/* Card Header: UAV ID + Online Indicator + Selection Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded border flex items-center justify-center ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                        }`}>
                          <Plane className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold font-mono text-slate-100 tracking-wide">
                              {uavId}
                            </span>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400 text-[9px] font-mono font-bold tracking-wider inline-flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                ACTIVE UAV
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {uav.mission_id || 'MISSION-001'}
                          </span>
                        </div>
                      </div>

                      {/* Online/Offline status & Status Indicator */}
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusBadgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot} animate-pulse`} />
                          {statusLabel}
                        </span>
                        <div className="flex items-center gap-1 text-[9px] font-mono text-emerald-400/90">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>ONLINE</span>
                        </div>
                      </div>
                    </div>

                    {/* Flight Phase Badge */}
                    <div className="flex items-center justify-between mb-3 text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">FLIGHT PHASE:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-bold">
                        {flightPhase}
                      </span>
                    </div>

                    {/* Metric Rows */}
                    <div className="space-y-2.5 text-xs font-mono">
                      {/* Engine Health */}
                      <div>
                        <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                          <span>ENGINE HEALTH</span>
                          <span className={`font-bold ${
                            Number(uav.engine_health) < 60 ? 'text-rose-400' :
                            Number(uav.engine_health) < 80 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {engineHealthVal}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              Number(uav.engine_health) < 60 ? 'bg-rose-500' :
                              Number(uav.engine_health) < 80 ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, Number(uav.engine_health) || 0))}%` }}
                          />
                        </div>
                      </div>

                      {/* Fitness Score */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400">FITNESS SCORE</span>
                        <span className="font-semibold text-slate-200">{fitnessVal}%</span>
                      </div>

                      {/* RUL */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">PREDICTED RUL</span>
                        <span className="font-semibold text-sky-300">{rulVal}</span>
                      </div>

                      {/* Mission Risk */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">MISSION RISK</span>
                        <RiskBadge level={missionRisk} />
                      </div>

                      {/* Predicted Fault */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">PREDICTED FAULT</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[130px]" title={faultName}>
                          {faultName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Set as Active Prompt */}
                  <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>STATUS: TRACKING</span>
                    <span className={isSelected ? 'text-sky-400 font-bold' : 'group-hover:text-slate-400'}>
                      {isSelected ? '● CURRENT ACTIVE' : 'CLICK TO SELECT'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
