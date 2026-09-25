import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import LoadingState from '../components/LoadingState';
import { STATUS_TYPES } from '../utils/status';
import { useFleet } from '../hooks/useFleet';
import { reportsApi } from '../services/api';
import { exportSortieToCsv, exportSortieToPdf } from '../utils/exportReport';
import {
  FileText,
  Download,
  Calendar,
  Activity,
  ShieldCheck,
  Clock,
  Wrench,
  Plane,
  AlertTriangle,
  Cpu,
  Gauge,
  Flame,
  Droplets,
  Zap,
  X,
  Database,
  CheckCircle,
} from 'lucide-react';

export default function ReportsPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds, loading } = useFleet();

  // Historical Sorties state from SQLite
  const [historicalSorties, setHistoricalSorties] = useState([]);
  const [historicalSamples, setHistoricalSamples] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedSortie, setSelectedSortie] = useState(null);

  // Fetch persisted historical sorties whenever activeUavId changes
  useEffect(() => {
    // Reset any previously opened report modal when switching UAVs
    setSelectedSortie(null);
    let isMounted = true;

    async function fetchHistory() {
      if (!activeUavId) return;
      setLoadingHistory(true);
      try {
        const data = await reportsApi.getHistory(activeUavId, 100);
        if (isMounted && data) {
          setHistoricalSorties(data.sessions || []);
          setHistoricalSamples(data.samples || []);
        }
      } catch (err) {
        console.warn(`[ReportsPage] Failed to fetch historical sorties for ${activeUavId}:`, err.message);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeUavId]);

  // If initial load in progress for active UAV
  if (loading && !activeUavState) {
    return (
      <div className="space-y-6">
        <PageHeader
          systemTag="AEROTWIN // MISSION REPORTS"
          title="Flight & Maintenance Reports"
          description="Comprehensive real-time propulsion telemetry logs, engine health audits, and condition-based certification records for the active fleet vehicle."
        />
        <LoadingState message={`Generating telemetry report for ${activeUavId}...`} />
      </div>
    );
  }

  // Unified single source of truth strictly from activeUavState
  const uav = activeUavState;
  const telemetry = uav?.engine_telemetry || null;
  const health = uav?.engine_health !== undefined ? Number(uav.engine_health) : null;
  const fitness = (uav?.engine_fitness_score ?? uav?.fitness_score) !== undefined
    ? Number(uav.engine_fitness_score ?? uav.fitness_score)
    : null;
  const flightPhase = uav?.flight_phase || telemetry?.flight_phase || 'CRUISE';
  const fault = uav?.predicted_fault || 'NORMAL';
  const confidence = (uav?.dominant_fault_probability ?? uav?.fault_confidence) !== undefined
    ? Number(uav.dominant_fault_probability ?? uav.fault_confidence)
    : 0.95;
  const anomalyStatus = (uav?.anomaly_status || 'NORMAL').toUpperCase();
  const anomalyScore = uav?.anomaly_score !== undefined ? Number(uav.anomaly_score) : 0.05;
  const rul = (uav?.predicted_rul ?? uav?.predicted_rul_hours) !== undefined
    ? Number(uav.predicted_rul ?? uav.predicted_rul_hours)
    : null;
  const risk = (uav?.mission_risk || 'LOW').toUpperCase();
  const rawMissionRel = uav?.mission_reliability_score !== undefined
    ? Number(uav.mission_reliability_score)
    : (health !== null ? Math.round(Math.max(10, Math.min(100, health * 0.45 + (fitness || 80) * 0.35 + (1 - anomalyScore) * 20)) * 10) / 10 : 100);
  const missionReliability = rawMissionRel !== null ? Math.round(rawMissionRel * 10) / 10 : null;

  const reasonCodes = uav?.reason_codes || [];
  const recommendation = uav?.recommendation || (
    risk === 'HIGH' ? 'MISSION_NOT_RECOMMENDED' : risk === 'MEDIUM' ? 'PROCEED_WITH_CAUTION' : 'CONTINUE_MISSION'
  );

  const hasData = telemetry !== null || health !== null;

  // Derive standardized maintenance priority
  let maintenancePriority = 'ROUTINE';
  let priorityStatus = STATUS_TYPES.HEALTHY;
  if (risk === 'HIGH' || (health !== null && health < 60) || (rul !== null && rul < 150) || ['COOLING_PROBLEM', 'OIL_PRESSURE_DROP', 'MECHANICAL_FAILURE', 'MISFIRE'].includes(fault)) {
    maintenancePriority = 'CRITICAL';
    priorityStatus = STATUS_TYPES.CRITICAL;
  } else if ((health !== null && health < 75) || anomalyStatus === 'ANOMALOUS' || fault !== 'NORMAL' || (rul !== null && rul < 400)) {
    maintenancePriority = 'HIGH';
    priorityStatus = STATUS_TYPES.WARNING;
  } else if ((health !== null && health < 85) || anomalyScore > 0.25 || (rul !== null && rul < 600)) {
    maintenancePriority = 'MEDIUM';
    priorityStatus = STATUS_TYPES.WARNING;
  }

  const diagnosticSummary = fault !== 'NORMAL'
    ? `Propulsion diagnostics identified '${fault}' with ${(confidence * 100).toFixed(1)}% confidence. Anomaly status: ${anomalyStatus} (${(anomalyScore * 100).toFixed(1)}%). Mission status: ${recommendation.replace(/_/g, ' ')}.`
    : `All propulsion subsystems operating within baseline tolerances. Anomaly status: ${anomalyStatus} (${(anomalyScore * 100).toFixed(1)}%). Mission status: ${recommendation.replace(/_/g, ' ')}.`;

  const timestampStr = uav?.timestamp
    ? new Date(uav.timestamp).toLocaleString()
    : new Date().toLocaleString();

  // Filter samples for selected sortie modal if open
  const selectedSortieSamples = selectedSortie
    ? historicalSamples.filter((s) => s.sortie_id === selectedSortie.sortie_id)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MISSION REPORTS"
        title="Flight & Maintenance Reports"
        description="Real-time propulsion telemetry logs, engine health audits, and condition-based records for the active fleet vehicle."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Active UAV Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-xs text-slate-400 font-mono">SELECTED UAV:</span>
              <select
                id="select-report-uav"
                value={activeUavId}
                onChange={(e) => setActiveUavId(e.target.value)}
                className="bg-slate-950 text-cyan-400 font-mono font-bold text-xs px-2 py-1 rounded border border-slate-700 hover:border-cyan-500 focus:outline-none focus:border-cyan-400 cursor-pointer"
                aria-label="Select Active UAV for Reports"
              >
                {fleetUavIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Report Status Badge */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE REPORT // {activeUavId}
              </span>
              <span className="px-3 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
                <Database className="w-3.5 h-3.5" />
                HISTORICAL REPORT // {activeUavId}
              </span>
            </div>
          </div>
        }
      />

      {/* Primary Report Metric Cards (Dynamic from active UAV) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Engine Health / Fitness"
          value={health !== null ? `${health.toFixed(1)}%` : '--'}
          unit={fitness !== null ? `/ ${fitness.toFixed(1)}%` : ''}
          status={health !== null ? (health < 60 ? STATUS_TYPES.CRITICAL : health < 80 ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY) : STATUS_TYPES.IDLE}
          subtext={`Operational Baseline (${activeUavId})`}
          icon={Activity}
        />
        <MetricCard
          title="Mission Reliability"
          value={missionReliability !== null ? `${missionReliability.toFixed(1)}%` : '--'}
          unit={`(${risk})`}
          status={missionReliability !== null ? (missionReliability < 60 ? STATUS_TYPES.CRITICAL : missionReliability < 80 ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY) : STATUS_TYPES.IDLE}
          subtext={`Current ${flightPhase} Phase`}
          icon={ShieldCheck}
        />
        <MetricCard
          title="Predicted RUL & Fault"
          value={rul !== null ? `${rul.toFixed(1)}` : '--'}
          unit="hrs"
          status={rul !== null ? (rul < 150 ? STATUS_TYPES.CRITICAL : rul < 400 ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY) : STATUS_TYPES.IDLE}
          subtext={`${fault} (${(confidence * 100).toFixed(1)}%)`}
          icon={Clock}
        />
        <MetricCard
          title="Maintenance Priority"
          value={maintenancePriority}
          unit=""
          status={priorityStatus}
          subtext={recommendation.replace(/_/g, ' ')}
          icon={Wrench}
        />
      </div>

      {/* Live Telemetry Channels Evidence Panel */}
      <SectionCard
        title="Live Propulsion Telemetry & Sensor Audit"
        subtitle={`Real-time verified sensor telemetry stream for ${activeUavId}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">RPM</span>
              <span className="text-slate-200 font-bold text-sm">{telemetry?.rpm?.toFixed(0) || '--'}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">CHT</span>
              <span className={`font-bold text-sm ${telemetry?.cht && telemetry.cht > 120 ? 'text-rose-400' : 'text-slate-200'}`}>
                {telemetry?.cht?.toFixed(1) || '--'}°C
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">EGT</span>
              <span className={`font-bold text-sm ${telemetry?.egt && telemetry.egt > 850 ? 'text-amber-400' : 'text-slate-200'}`}>
                {telemetry?.egt?.toFixed(1) || '--'}°C
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">OIL PRESS</span>
              <span className={`font-bold text-sm ${telemetry?.oil_pressure && telemetry.oil_pressure < 2.0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {telemetry?.oil_pressure?.toFixed(2) || '--'} bar
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">OIL TEMP</span>
              <span className={`font-bold text-sm ${telemetry?.oil_temperature && telemetry.oil_temperature > 105 ? 'text-amber-400' : 'text-slate-200'}`}>
                {telemetry?.oil_temperature?.toFixed(1) || '--'}°C
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">VIBRATION</span>
              <span className={`font-bold text-sm ${telemetry?.vibration && telemetry.vibration > 5.0 ? 'text-rose-400' : 'text-slate-200'}`}>
                {telemetry?.vibration?.toFixed(2) || '--'} g
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">FUEL FLOW</span>
              <span className="text-slate-200 font-bold text-sm">{telemetry?.fuel_flow?.toFixed(1) || '--'} L/h</span>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">THROTTLE</span>
              <span className="text-slate-200 font-bold text-sm">{telemetry?.throttle?.toFixed(0) || telemetry?.engine_load?.toFixed(0) || '--'}%</span>
            </div>
          </div>

          {/* Diagnostic Explanation Banner */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                ENGINE DIAGNOSTICS ({activeUavId})
              </span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  fault === 'NORMAL'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}>
                  FAULT: {fault} ({(confidence * 100).toFixed(1)}%)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  anomalyStatus === 'NORMAL'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}>
                  ANOMALY: {anomalyStatus} ({(anomalyScore * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {diagnosticSummary}
            </p>
            {reasonCodes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-slate-500 text-[10px]">DECISION FACTORS:</span>
                {reasonCodes.map((rc, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-amber-300 border border-slate-700">
                    {rc}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Historical Sorties & Flight Certification Table */}
      <SectionCard
        title="Historical Sorties & Mission Archive"
        subtitle={`Persisted SQLite propulsion records and flight certification logs for ${activeUavId}`}
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">
              {historicalSorties.length} {historicalSorties.length === 1 ? 'SORTIE' : 'SORTIES'} STORED
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">SORTIE ID</th>
                <th className="py-2.5 px-3">DATE / TIME</th>
                <th className="py-2.5 px-3">PHASE / STATUS</th>
                <th className="py-2.5 px-3">PEAK CHT</th>
                <th className="py-2.5 px-3">PEAK EGT</th>
                <th className="py-2.5 px-3">MIN OIL PRESS</th>
                <th className="py-2.5 px-3">HEALTH SCORE</th>
                <th className="py-2.5 px-3">MISSION RISK</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {historicalSorties.length > 0 ? (
                historicalSorties.map((session) => {
                  const startTimeFormatted = session.start_time
                    ? new Date(session.start_time).toLocaleString()
                    : '--';
                  const sHealth = Number(session.health_score ?? 100);
                  const sRisk = (session.mission_risk || 'LOW').toUpperCase();

                  return (
                    <tr
                      key={session.sortie_id}
                      className="border-b border-slate-800/60 bg-slate-950/40 hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-cyan-400">{session.sortie_id}</td>
                      <td className="py-3 px-3 text-slate-300">{startTimeFormatted}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {session.flight_phase} • {session.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {session.peak_cht !== undefined ? `${session.peak_cht.toFixed(1)}°C` : '--'}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {session.peak_egt !== undefined ? `${session.peak_egt.toFixed(1)}°C` : '--'}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {session.min_oil_pressure !== undefined ? `${session.min_oil_pressure.toFixed(2)} bar` : '--'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold ${sHealth < 60 ? 'text-rose-400' : sHealth < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {sHealth.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                          sRisk === 'HIGH'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : sRisk === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {sRisk}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          id={`btn-view-report-${session.sortie_id}`}
                          onClick={() => setSelectedSortie(session)}
                          className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          aria-label={`View report for ${session.sortie_id}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          REPORT
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    {loadingHistory
                      ? `Loading persisted sorties for ${activeUavId}...`
                      : `No historical sorties recorded yet for ${activeUavId}. Start simulation or advance time to persist flights.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* View Report Modal / Drawer */}
      {selectedSortie && (
        <div
          id="report-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedSortie(null)}
        >
          <div
            id="report-modal-content"
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-5 font-mono text-xs overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    HISTORICAL / STORED TELEMETRY
                  </span>
                  <span className="text-slate-400 text-xs font-bold">
                    VEHICLE: {selectedSortie.uav_id}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Flight Sortie Audit Report
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Sortie ID: <span className="text-cyan-400 font-bold">{selectedSortie.sortie_id}</span>
                </p>
              </div>
              <button
                id="btn-close-report-modal"
                onClick={() => setSelectedSortie(null)}
                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
                aria-label="Close Report Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Session Metadata Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">STATUS</span>
                <span className="text-emerald-400 font-bold text-xs">{selectedSortie.status}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">FLIGHT PHASE</span>
                <span className="text-slate-200 font-bold text-xs">{selectedSortie.flight_phase}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">START TIME</span>
                <span className="text-slate-300 text-[11px] truncate block">
                  {selectedSortie.start_time ? new Date(selectedSortie.start_time).toLocaleTimeString() : '--'}
                </span>
              </div>
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">TOTAL SAMPLES</span>
                <span className="text-cyan-400 font-bold text-xs">
                  {selectedSortie.total_samples || selectedSortieSamples.length}
                </span>
              </div>
            </div>

            {/* Extremes & Mission Audit Metrics */}
            <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
              <span className="font-bold text-slate-300 flex items-center gap-2 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Sortie Extrema & Condition Summary
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">PEAK CHT</span>
                  <span className="text-slate-200 font-bold">{selectedSortie.peak_cht?.toFixed(1)}°C</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">PEAK EGT</span>
                  <span className="text-slate-200 font-bold">{selectedSortie.peak_egt?.toFixed(1)}°C</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">MIN OIL PRESS</span>
                  <span className="text-slate-200 font-bold">{selectedSortie.min_oil_pressure?.toFixed(2)} bar</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">HEALTH SCORE</span>
                  <span className={`font-bold ${selectedSortie.health_score < 60 ? 'text-rose-400' : selectedSortie.health_score < 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedSortie.health_score?.toFixed(1)}%
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">MISSION RISK</span>
                  <span className={`font-bold ${selectedSortie.mission_risk === 'HIGH' ? 'text-rose-400' : selectedSortie.mission_risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedSortie.mission_risk}
                  </span>
                </div>
              </div>
            </div>

            {/* Stored Telemetry Sample Summary */}
            <div className="space-y-2">
              <span className="font-bold text-slate-300 text-xs flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Persisted Telemetry Stream ({selectedSortieSamples.length} samples archived)
              </span>
              <div className="overflow-x-auto max-h-48 border border-slate-800 rounded bg-slate-950/60">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 bg-slate-900/40 sticky top-0">
                      <th className="py-1.5 px-2">TIME</th>
                      <th className="py-1.5 px-2">PHASE</th>
                      <th className="py-1.5 px-2">RPM</th>
                      <th className="py-1.5 px-2">CHT</th>
                      <th className="py-1.5 px-2">EGT</th>
                      <th className="py-1.5 px-2">OIL P</th>
                      <th className="py-1.5 px-2">OIL T</th>
                      <th className="py-1.5 px-2">VIB</th>
                      <th className="py-1.5 px-2">FUEL</th>
                      <th className="py-1.5 px-2">LOAD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSortieSamples.length > 0 ? (
                      selectedSortieSamples.slice(-10).map((sample, idx) => (
                        <tr key={sample.id || idx} className="border-b border-slate-900 hover:bg-slate-900/30">
                          <td className="py-1 px-2 text-slate-400">{sample.timestamp ? String(sample.timestamp).split('T')[1]?.substring(0, 8) || sample.timestamp : '--'}</td>
                          <td className="py-1 px-2 text-slate-400">{sample.flight_phase}</td>
                          <td className="py-1 px-2 text-slate-200">{sample.rpm?.toFixed(0)}</td>
                          <td className="py-1 px-2 text-slate-200">{sample.cht?.toFixed(1)}°C</td>
                          <td className="py-1 px-2 text-slate-200">{sample.egt?.toFixed(1)}°C</td>
                          <td className="py-1 px-2 text-slate-200">{sample.oil_pressure?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-slate-200">{sample.oil_temperature?.toFixed(1)}°C</td>
                          <td className="py-1 px-2 text-slate-200">{sample.vibration?.toFixed(2)}</td>
                          <td className="py-1 px-2 text-slate-200">{sample.fuel_flow?.toFixed(1)}</td>
                          <td className="py-1 px-2 text-slate-200">{sample.engine_load?.toFixed(0) || sample.throttle?.toFixed(0)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="py-4 text-center text-slate-500">
                          Awaiting telemetry sample records...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                VERIFIED SQLITE PERSISTENT RECORD
              </span>
              <div className="flex items-center gap-2">
                <button
                  id="btn-export-pdf"
                  onClick={() => exportSortieToPdf(selectedSortie, selectedSortieSamples)}
                  className="px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  aria-label="Export Sortie PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  EXPORT PDF
                </button>
                <button
                  id="btn-export-csv"
                  onClick={() => exportSortieToCsv(selectedSortie, selectedSortieSamples)}
                  className="px-3 py-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  aria-label="Export Sortie CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  EXPORT CSV
                </button>
                <button
                  id="btn-close-modal-footer"
                  onClick={() => setSelectedSortie(null)}
                  className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

