import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import LoadingState from '../components/LoadingState';
import { STATUS_TYPES } from '../utils/status';
import { useFleet } from '../hooks/useFleet';
import {
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Gauge,
  Activity,
  ShieldAlert,
  Flame,
  Droplets,
  Zap,
  Plane,
  Cpu,
  ShieldCheck,
} from 'lucide-react';

export default function MaintenancePage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds, loading } = useFleet();

  // If initial load in progress for active UAV
  if (loading && !activeUavState) {
    return (
      <div className="space-y-6">
        <PageHeader
          systemTag="AEROTWIN // PREDICTIVE MAINTENANCE"
          title="Condition-Based Maintenance & RUL"
          description="Continuous health tracking of engine line-replaceable units (LRUs), wear accumulation, and condition-driven maintenance intervals."
        />
        <LoadingState message={`Connecting to Predictive Maintenance engine for ${activeUavId}...`} />
      </div>
    );
  }

  // Unified single source of truth from activeUavState
  const uav = activeUavState;
  const telemetry = uav?.engine_telemetry || null;
  const health = uav?.engine_health !== undefined ? Number(uav.engine_health) : null;
  const fitness = (uav?.engine_fitness_score ?? uav?.fitness_score) !== undefined
    ? Number(uav.engine_fitness_score ?? uav.fitness_score)
    : null;
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
  const reasonCodes = uav?.reason_codes || [];
  const recommendation = uav?.recommendation || (
    risk === 'HIGH' ? 'MISSION_NOT_RECOMMENDED' : risk === 'MEDIUM' ? 'PROCEED_WITH_CAUTION' : 'CONTINUE_MISSION'
  );

  const hasData = telemetry !== null || health !== null;

  const explanation = uav?.explanation || (
    fault !== 'NORMAL'
      ? `Predicted ${fault} with ${(confidence * 100).toFixed(1)}% probability. Anomaly score: ${(anomalyScore * 100).toFixed(1)}%. Maintenance recommended.`
      : 'All engine subsystems operating within nominal limits. Routine inspection intervals apply.'
  );

  // Derive standardized maintenance tier
  let maintenanceTier = 'NORMAL / MONITOR';
  let tierBadgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  let tierIcon = CheckCircle2;
  let priorityStatus = STATUS_TYPES.HEALTHY;
  let rulStatus = STATUS_TYPES.HEALTHY;

  if (!hasData) {
    maintenanceTier = 'STANDBY / AWAITING DATA';
    tierBadgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';
    priorityStatus = STATUS_TYPES.IDLE;
    rulStatus = STATUS_TYPES.IDLE;
  } else if (risk === 'HIGH' || (health !== null && health < 60) || (rul !== null && rul < 150) || ['COOLING_PROBLEM', 'OIL_PRESSURE_DROP', 'MECHANICAL_FAILURE', 'MISFIRE'].includes(fault)) {
    maintenanceTier = 'CRITICAL / MISSION NOT RECOMMENDED';
    tierBadgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/40 animate-pulse';
    tierIcon = AlertOctagon;
    priorityStatus = STATUS_TYPES.CRITICAL;
    rulStatus = STATUS_TYPES.CRITICAL;
  } else if ((health !== null && health < 75) || anomalyStatus === 'ANOMALOUS' || fault !== 'NORMAL' || (rul !== null && rul < 400)) {
    maintenanceTier = 'MAINTENANCE REQUIRED';
    tierBadgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    tierIcon = AlertTriangle;
    priorityStatus = STATUS_TYPES.WARNING;
    rulStatus = STATUS_TYPES.WARNING;
  } else if ((health !== null && health < 85) || anomalyScore > 0.25 || (rul !== null && rul < 600)) {
    maintenanceTier = 'INSPECTION REQUIRED';
    tierBadgeStyle = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
    tierIcon = AlertTriangle;
    priorityStatus = STATUS_TYPES.WARNING;
    rulStatus = STATUS_TYPES.HEALTHY;
  }

  // Calculate composite degradation metric (0% - 100%)
  const compositeWear = health !== null ? Math.max(0, Math.min(100, 100 - health)) : 0;

  // Dynamic Subsystem & LRU wear tracking derived strictly from active UAV physical/AI telemetry
  const lrus = [
    {
      id: 'ignition',
      name: 'Spark Plugs & Ignition Harness',
      interval: '50 hrs',
      icon: Zap,
      wear: hasData ? Math.min(100, compositeWear * 0.85 + (fault === 'MISFIRE' || fault === 'CYLINDER_MISFIRE' ? 50 : 0) + (anomalyScore > 0.4 ? 12 : 0)).toFixed(1) : '--',
      status: (fault === 'MISFIRE' || fault === 'CYLINDER_MISFIRE' || (hasData && compositeWear > 40)) ? 'INSPECT' : 'NOMINAL',
    },
    {
      id: 'fuel',
      name: 'Fuel Injector Nozzles (Cyl 1-4)',
      interval: '100 hrs',
      icon: Droplets,
      wear: hasData ? Math.min(100, compositeWear * 0.9 + (fault === 'INJECTOR_CLOGGING' || fault === 'INJECTOR_ABNORMALITY' ? 55 : 0) + (telemetry?.fuel_flow && telemetry.fuel_flow > 30 ? 15 : 0)).toFixed(1) : '--',
      status: (fault === 'INJECTOR_CLOGGING' || fault === 'INJECTOR_ABNORMALITY' || (hasData && compositeWear > 35)) ? 'SERVICE REQUIRED' : 'NOMINAL',
    },
    {
      id: 'lubrication',
      name: 'Oil Filter & Lubrication Circuit',
      interval: '100 hrs',
      icon: Gauge,
      wear: hasData ? Math.min(100, compositeWear * 1.05 + (fault === 'OIL_PRESSURE_DROP' || fault === 'LUBRICATION_PROBLEM' ? 60 : 0) + (telemetry?.oil_temperature && telemetry.oil_temperature > 95 ? 18 : 0)).toFixed(1) : '--',
      status: (fault === 'OIL_PRESSURE_DROP' || fault === 'LUBRICATION_PROBLEM' || (telemetry?.oil_pressure && telemetry.oil_pressure < 2.0)) ? 'CRITICAL' : (hasData && compositeWear > 30 ? 'INSPECT' : 'NOMINAL'),
    },
    {
      id: 'cooling',
      name: 'Radiator Core & Coolant Circuit',
      interval: '150 hrs',
      icon: Activity,
      wear: hasData ? Math.min(100, compositeWear * 1.1 + (fault === 'COOLING_PROBLEM' ? 65 : 0) + (telemetry?.cht && telemetry.cht > 120 ? 20 : 0)).toFixed(1) : '--',
      status: (fault === 'COOLING_PROBLEM' || (telemetry?.cht && telemetry.cht > 125)) ? 'CRITICAL' : (hasData && compositeWear > 30 ? 'INSPECT' : 'NOMINAL'),
    },
    {
      id: 'exhaust',
      name: 'Exhaust Valves & Turbocharger',
      interval: '250 hrs',
      icon: Flame,
      wear: hasData ? Math.min(100, compositeWear * 0.95 + (telemetry?.egt && telemetry.egt > 850 ? 25 : 0) + (telemetry?.vibration && telemetry.vibration > 4.0 ? 20 : 0)).toFixed(1) : '--',
      status: (telemetry?.egt && telemetry.egt > 860) ? 'INSPECT' : 'NOMINAL',
    },
    {
      id: 'cylinder',
      name: 'Piston Compression Rings & Bores',
      interval: '500 hrs',
      icon: Wrench,
      wear: hasData ? Math.min(100, compositeWear * 1.0).toFixed(1) : '--',
      status: (compositeWear > 40) ? 'OVERHAUL SOON' : 'NOMINAL',
    },
  ];

  // Specific maintenance action recommendations based strictly on active UAV condition
  const getActionDirectives = () => {
    if (!hasData) {
      return [
        { task: 'Awaiting Telemetry Sync', detail: 'Telemetry stream standby. LRU condition tracker waiting for engine ignition.', urgency: 'LOW' }
      ];
    }
    const actions = [];
    if (fault === 'COOLING_PROBLEM' || (telemetry?.cht && telemetry.cht > 120)) {
      actions.push({
        task: 'Cooling System Inspection & Flush',
        detail: `High CHT detected (${telemetry?.cht?.toFixed(1) || '--'}°C). Inspect radiator core fins, check coolant pump impeller, verify thermostat operation.`,
        urgency: 'HIGH',
      });
      actions.push({
        task: 'CHT Probe Calibration',
        detail: 'Verify Cylinder Head Temperature sensor wiring harness and RTD resistance calibration.',
        urgency: 'MEDIUM',
      });
    }
    if (fault === 'OIL_PRESSURE_DROP' || fault === 'LUBRICATION_PROBLEM' || (telemetry?.oil_pressure && telemetry.oil_pressure < 2.0)) {
      actions.push({
        task: 'Oil Circuit Pressure Relief Valve Check',
        detail: `Low oil pressure (${telemetry?.oil_pressure?.toFixed(2) || '--'} bar). Inspect oil pump pressure regulator and check crankcase sump level.`,
        urgency: 'HIGH',
      });
      actions.push({
        task: 'Oil Filter Replacement & Spectrometric Analysis',
        detail: 'Replace spin-on oil filter element and extract lubricant sample for wear particle spectroscopy (SOAP).',
        urgency: 'HIGH',
      });
    }
    if (fault === 'INJECTOR_CLOGGING' || fault === 'INJECTOR_ABNORMALITY') {
      actions.push({
        task: 'Fuel Injector Ultrasonic Cleaning',
        detail: 'Remove all 4 electronic fuel injectors for spray pattern testing and ultrasonic cavitation bath cleaning.',
        urgency: 'HIGH',
      });
    }
    if (fault === 'MISFIRE' || fault === 'CYLINDER_MISFIRE' || fault === 'SENSOR_ANOMALY') {
      actions.push({
        task: 'Ignition Harness & Spark Plug Replacement',
        detail: 'Inspect dual electronic ignition coils, check plug gap wear (spec: 0.6-0.7mm), inspect HT leads.',
        urgency: 'MEDIUM',
      });
    }
    if (rul !== null && rul < 200) {
      actions.push({
        task: 'Critical Engine Overhaul Scheduling',
        detail: `Predicted RUL is critically low at ${rul.toFixed(1)} hrs. Ground vehicle and schedule immediate overhaul hangar bay.`,
        urgency: 'HIGH',
      });
    } else if (rul !== null && rul < 500) {
      actions.push({
        task: 'Condition-Based Maintenance Overhaul Prep',
        detail: `Predicted RUL is ${rul.toFixed(1)} hrs. Pre-order replacement gaskets, bearings, and schedule inspection.`,
        urgency: 'MEDIUM',
      });
    }
    if (actions.length === 0) {
      actions.push({
        task: 'Routine 50-Hour Pre-Flight Service',
        detail: 'Perform visual inspection of air intake, check oil level, verify propeller torque, check fluid lines for chafing.',
        urgency: 'LOW',
      });
      actions.push({
        task: 'Continuous Digital Twin RUL Tracking',
        detail: 'Engine operating nominally within baseline envelopes. All line replaceable units (LRUs) cleared for flight operations.',
        urgency: 'LOW',
      });
    }
    return actions;
  };

  const actionDirectives = getActionDirectives();

  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // PREDICTIVE MAINTENANCE"
        title="Condition-Based Maintenance & RUL"
        description="Continuous health tracking of engine line-replaceable units (LRUs), wear accumulation, and condition-driven maintenance intervals."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Active UAV Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
              <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-xs text-slate-400 font-mono">SELECTED UAV:</span>
              <select
                id="maintenance-uav-selector"
                value={activeUavId}
                onChange={(e) => setActiveUavId(e.target.value)}
                className="bg-slate-950 text-cyan-400 font-mono font-bold text-xs px-2 py-1 rounded border border-slate-700 hover:border-cyan-500 focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                {fleetUavIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            {/* Maintenance Priority Tier Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 ${tierBadgeStyle}`}>
                {React.createElement(tierIcon, { className: 'w-3.5 h-3.5' })}
                {maintenanceTier}
              </span>
            </div>
          </div>
        }
      />

      {/* High-level Wear & AI Predictive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Predicted RUL"
          value={rul !== null ? `${rul.toFixed(1)}` : '--'}
          unit="hrs"
          status={rulStatus}
          subtext={rul !== null ? (rul < 150 ? 'Critical Overhaul Threshold' : rul < 400 ? 'Approaching Maintenance' : 'Nominal Useful Life') : 'Until Overhaul Threshold'}
          icon={Clock}
        />
        <MetricCard
          title="Engine Health / Fitness"
          value={health !== null ? `${health.toFixed(1)}%` : '--'}
          unit={fitness !== null ? `/ ${fitness.toFixed(1)}%` : ''}
          status={health !== null ? (health < 60 ? STATUS_TYPES.CRITICAL : health < 80 ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY) : STATUS_TYPES.IDLE}
          subtext="Health & Operational Fitness"
          icon={Activity}
        />
        <MetricCard
          title="Critical Wear Index"
          value={hasData ? `${compositeWear.toFixed(1)}%` : '--'}
          unit=""
          status={compositeWear > 40 ? STATUS_TYPES.CRITICAL : compositeWear > 20 ? STATUS_TYPES.WARNING : STATUS_TYPES.HEALTHY}
          subtext="Composite Degradation Metric"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Maintenance Priority"
          value={maintenanceTier.split('/')[0].trim()}
          unit=""
          status={priorityStatus}
          subtext={`UAV ID: ${activeUavId}`}
          icon={Wrench}
        />
      </div>

      {/* Selected UAV AI Health Overview Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">ACTIVE VEHICLE</span>
            <span className="text-cyan-400 font-bold text-sm">{activeUavId}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">PREDICTED FAULT</span>
            <span className={`font-bold ${fault === 'NORMAL' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {fault}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">FAULT CONFIDENCE</span>
            <span className="text-slate-200 font-bold">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">ANOMALY STATUS</span>
            <span className={`font-bold ${anomalyStatus === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {anomalyStatus} ({(anomalyScore * 100).toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">MISSION RISK</span>
            <span className={`font-bold ${risk === 'HIGH' ? 'text-rose-400' : risk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {risk}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px]">REASON CODES</span>
            <span className="text-slate-300 truncate block">
              {reasonCodes.length > 0 ? reasonCodes.slice(0, 2).join(', ') : 'NOMINAL_STATE'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Replaceable Units (LRU) Wear Tracking */}
        <SectionCard
          title="Subsystem Wear & Degradation Tracking"
          subtitle={`Health degradation per engine LRU for ${activeUavId}`}
        >
          <div className="space-y-3 font-mono text-xs">
            {lrus.map((item) => {
              const IconComp = item.icon;
              const wearNum = parseFloat(item.wear);
              const isWarning = !isNaN(wearNum) && wearNum > 25;
              const isCritical = !isNaN(wearNum) && wearNum > 45;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconComp className={`w-4 h-4 ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-cyan-400'}`} />
                      <span className="font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">INTERVAL: {item.interval}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          item.status === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : item.status.includes('REQUIRED') || item.status === 'INSPECT'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Wear Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Accumulated Wear</span>
                      <span className={`font-bold ${isCritical ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-300'}`}>
                        {item.wear}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, isNaN(wearNum) ? 0 : wearNum))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Condition-Based Recommendations & Directives */}
        <SectionCard
          title="Recommended Maintenance Actions"
          subtitle={`Derived from anomaly detection & RUL for ${activeUavId}`}
        >
          <div className="space-y-4">
            {/* Maintenance Decision Summary Banner */}
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${
              priorityStatus === STATUS_TYPES.CRITICAL
                ? 'bg-rose-950/25 border-rose-500/40'
                : priorityStatus === STATUS_TYPES.WARNING
                ? 'bg-amber-950/25 border-amber-500/40'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <ShieldAlert className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                priorityStatus === STATUS_TYPES.CRITICAL ? 'text-rose-400' : priorityStatus === STATUS_TYPES.WARNING ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              <div className="font-mono text-xs space-y-1">
                <span className="font-bold text-slate-200 block">DIAGNOSTIC EVIDENCE</span>
                <p className="text-slate-400 leading-relaxed">{explanation}</p>
              </div>
            </div>

            {/* Action Items List */}
            <div className="space-y-2.5 font-mono text-xs">
              {actionDirectives.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">{act.task}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-7">{act.detail}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${
                      act.urgency === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : act.urgency === 'MEDIUM'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {act.urgency} PRIORITY
                  </span>
                </div>
              ))}
            </div>

            {/* Critical Telemetry Baseline Snapshot */}
            {telemetry && (
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-[11px]">
                <span className="text-[10px] text-slate-500 block mb-1.5">TELEMETRY EVIDENCE SNAPSHOT ({activeUavId})</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400">
                  <div>RPM: <span className="text-slate-200 font-bold">{telemetry.rpm?.toFixed(0) || '--'}</span></div>
                  <div>CHT: <span className="text-slate-200 font-bold">{telemetry.cht?.toFixed(1) || '--'}°C</span></div>
                  <div>EGT: <span className="text-slate-200 font-bold">{telemetry.egt?.toFixed(1) || '--'}°C</span></div>
                  <div>OIL P: <span className="text-slate-200 font-bold">{telemetry.oil_pressure?.toFixed(2) || '--'} bar</span></div>
                  <div>OIL T: <span className="text-slate-200 font-bold">{telemetry.oil_temperature?.toFixed(1) || '--'}°C</span></div>
                  <div>VIB: <span className="text-slate-200 font-bold">{telemetry.vibration?.toFixed(2) || '--'} g</span></div>
                  <div>FUEL: <span className="text-slate-200 font-bold">{telemetry.fuel_flow?.toFixed(1) || '--'} L/h</span></div>
                  <div>LOAD: <span className="text-slate-200 font-bold">{telemetry.engine_load?.toFixed(1) || '--'}%</span></div>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
