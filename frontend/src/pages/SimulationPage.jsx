import React, { useState, useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatusCard from '../components/StatusCard';
import TelemetryCard from '../components/TelemetryCard';
import { STATUS_TYPES } from '../utils/status';
import { useFleet } from '../context/FleetContext';
import { useTelemetry } from '../hooks/useTelemetry';
import { simulationApi, fleetApi } from '../services/api';
import {
  Play,
  Square,
  Sliders,
  AlertTriangle,
  Layers,
  Plane,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const FLIGHT_PHASES = ['GROUND', 'TAKEOFF', 'CLIMB', 'CRUISE', 'DESCENT', 'LANDING'];

// Standard operational flight phase envelopes matching Rotax 914/915 aero piston models
const FLIGHT_PHASE_PRESETS = {
  GROUND: { throttle: 18, altitude: 0, indicatedAirspeed: 0 },
  TAKEOFF: { throttle: 96, altitude: 200, indicatedAirspeed: 65 },
  CLIMB: { throttle: 85, altitude: 2500, indicatedAirspeed: 80 },
  CRUISE: { throttle: 68, altitude: 4500, indicatedAirspeed: 85 },
  DESCENT: { throttle: 38, altitude: 1800, indicatedAirspeed: 80 },
  LANDING: { throttle: 25, altitude: 100, indicatedAirspeed: 55 },
};

const FAULT_DEFINITIONS = [
  {
    id: 'FLT-01',
    name: 'Fuel Injector Clogging / Partial Lean',
    severity: 'WARNING',
    faultType: 'INJECTOR_ABNORMALITY',
    faultSeverity: 0.75,
    degradation: 0.1,
    targetComponent: 'FUEL INJECTOR / DELIVERY SYSTEM',
    description: 'Lean fuel mixture, elevated and erratic EGT, fuel starvation, and slight RPM jitter.',
  },
  {
    id: 'FLT-02',
    name: 'Cylinder Exhaust Valve Leakage',
    severity: 'CRITICAL',
    faultType: 'COOLING_PROBLEM',
    faultSeverity: 0.85,
    degradation: 0.25,
    targetComponent: 'CYLINDER HEAD & EXHAUST VALVE',
    description: 'Severe combustion thermal leakage driving rapid Cylinder Head Temperature (CHT) elevation.',
  },
  {
    id: 'FLT-03',
    name: 'Coolant Radiator Fouling / Thermal Degradation',
    severity: 'WARNING',
    faultType: 'COOLING_PROBLEM',
    faultSeverity: 0.65,
    degradation: 0.15,
    targetComponent: 'COOLANT RADIATOR / THERMAL DISSIPATION',
    description: 'Heat rejection capacity deficit causing elevated CHT and progressive oil temperature rise.',
  },
  {
    id: 'FLT-04',
    name: 'Oil Scavenge Pump Loss / Pressure Drop',
    severity: 'CRITICAL',
    faultType: 'LUBRICATION_PROBLEM',
    faultSeverity: 0.80,
    degradation: 0.2,
    targetComponent: 'OIL PUMP / LUBRICATION CIRCUIT',
    description: 'Loss of hydrodynamic oil pressure, oil temperature surge, and elevated mechanical vibration.',
  },
  {
    id: 'FLT-05',
    name: 'Turbocharger Wastegate Actuator Stiction',
    severity: 'WARNING',
    faultType: 'SENSOR_ANOMALY',
    targetSensor: 'manifold_pressure',
    faultSeverity: 0.70,
    degradation: 0.35,
    targetComponent: 'TURBOCHARGER / WASTEGATE ACTUATOR',
    description: 'Boost control perturbation and mechanical degradation inducing vibration and thermal variance.',
  },
];

export default function SimulationPage() {
  const { activeUavId, activeUavState, setActiveUavId, fleetUavIds, refreshUav } = useFleet();
  const { packet: wsPacket, isConnected: wsConnected } = useTelemetry();

  // Real Mission Parameter Form Inputs
  const [params, setParams] = useState({
    altitude: 4500,
    throttle: 68,
    indicatedAirspeed: 85,
    ambientTemperature: 15,
    humidity: 50,
    windSpeed: 5,
    missionDurationHours: 2.0,
    flightPhase: 'CRUISE',
  });

  const [isStarting, setIsStarting] = useState(false);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Active Fault Injection tracking per UAV
  const [uavFaults, setUavFaults] = useState({});
  const [isInjectingFault, setIsInjectingFault] = useState(false);
  const [faultErrorMsg, setFaultErrorMsg] = useState(null);

  const activeFaultId = uavFaults[activeUavId] || null;
  const activeFault = FAULT_DEFINITIONS.find((f) => f.id === activeFaultId) || null;

  // Normalizes diverse telemetry formats (flat TelemetryResponse, nested UAVStateResponse, WebSocket packets)
  const normalizeSimulationState = (data) => {
    if (!data) return null;
    const tel = data.engine_telemetry || data.telemetry || data;
    const rawThrottle = tel.throttle !== undefined ? tel.throttle : data.throttle;
    const rawAlt = tel.altitude !== undefined ? tel.altitude : data.altitude;
    const rawPhase = data.flight_phase || tel.flight_phase;
    const rawLoad = tel.engine_load !== undefined ? tel.engine_load : data.engine_load;

    const normalizedTel = {
      ...tel,
      rpm: tel.rpm,
      throttle: rawThrottle,
      altitude: rawAlt,
      flight_phase: rawPhase,
      engine_load: rawLoad,
      ambient_temperature: tel.ambient_temperature !== undefined ? tel.ambient_temperature : data.ambient_temperature,
      humidity: tel.humidity !== undefined ? tel.humidity : data.humidity,
      wind_speed: tel.wind_speed !== undefined ? tel.wind_speed : data.wind_speed,
      cht: tel.cht,
      egt: tel.egt,
      oil_pressure: tel.oil_pressure,
      oil_temperature: tel.oil_temperature,
      vibration: tel.vibration,
      fuel_flow: tel.fuel_flow,
    };

    return {
      ...data,
      flight_phase: rawPhase,
      throttle: rawThrottle,
      altitude: rawAlt,
      engine_telemetry: normalizedTel,
      telemetry: normalizedTel,
    };
  };

  // When active UAV switches, update simResult for that UAV
  useEffect(() => {
    if (activeUavState && activeUavState.uav_id === activeUavId) {
      setSimResult(normalizeSimulationState(activeUavState));
    } else {
      setSimResult(null);
    }
  }, [activeUavId, activeUavState]);

  // Continuous live telemetry update loop while simulation is running
  useEffect(() => {
    if (!isSimRunning) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const fresh = await fleetApi.getUavState(activeUavId);
        if (
          isMounted &&
          fresh &&
          fresh.uav_id === activeUavId &&
          (fresh.engine_telemetry || fresh.rpm !== undefined)
        ) {
          setSimResult(normalizeSimulationState(fresh));
          if (typeof refreshUav === 'function') {
            refreshUav(activeUavId);
          }
        }
      } catch (err) {
        // Non-blocking: background telemetry updates should not interrupt UI
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimRunning, activeUavId, refreshUav]);

  // Subscribe to real-time WebSocket telemetry for the active UAV
  useEffect(() => {
    if (!wsPacket) return;
    // Strict UAV matching: ignore packets that do not match the active UAV
    const packetUavId = wsPacket.uav_id || wsPacket.uav_state?.uav_id;
    if (packetUavId && packetUavId !== activeUavId) {
      return;
    }
    if (!packetUavId && activeUavId !== 'UAV-001') {
      return;
    }

    const telData = wsPacket.telemetry || wsPacket.engine_telemetry || wsPacket;
    if (telData && telData.rpm !== undefined) {
      setSimResult(normalizeSimulationState(wsPacket));
      // If real-time telemetry is actively streaming, mark simulation as running and clear false start timeout
      setIsSimRunning(true);
      setErrorMsg((curr) => (curr && curr.toLowerCase().includes('timeout') ? null : curr));
    }
  }, [wsPacket, activeUavId]);

  const handleInputChange = (field, value) => {
    setParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStartSimulation = async () => {
    setIsStarting(true);
    setErrorMsg(null);

    const payload = {
      uav_id: activeUavId,
      engine_id: `AERO-${activeUavId.replace('UAV-', '')}`,
      mission_id: `MSN-${activeUavId.replace('UAV-', '')}`,
      altitude: Number(params.altitude),
      throttle: Number(params.throttle),
      ambient_temperature: Number(params.ambientTemperature),
      humidity: Number(params.humidity),
      wind_speed: Number(params.windSpeed),
      mission_duration_hours: Number(params.missionDurationHours),
      flight_phase: params.flightPhase,
      degradation: 0.0,
      fault_type: 'NORMAL',
      fault_severity: 0.0,
    };

    try {
      const response = await simulationApi.start(payload);
      setSimResult(normalizeSimulationState(response));
      setIsSimRunning(true);
      setErrorMsg(null);
      // Trigger background refresh so other fleet pages immediately reflect the new simulated state
      if (typeof refreshUav === 'function') {
        refreshUav(activeUavId);
      }
    } catch (err) {
      console.error('[SimulationPage] Failed to start simulation:', err);

      // Display genuine error or backend validation failure
      const detail =
        err.response?.data?.detail || err.message || 'Failed to initialize engine simulation session.';
      setErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsStarting(false);
    }
  };

  const handleApplyFault = async (fault) => {
    setIsInjectingFault(true);
    setFaultErrorMsg(null);
    try {
      const payload = {
        uav_id: activeUavId,
        fault_type: fault.faultType,
        severity: fault.faultSeverity,
        degradation: fault.degradation,
        target_sensor: fault.targetSensor || null,
      };
      const response = await simulationApi.injectFault(payload);
      setSimResult(normalizeSimulationState(response));
      setIsSimRunning(true);
      setUavFaults((prev) => ({ ...prev, [activeUavId]: fault.id }));
      if (typeof refreshUav === 'function') {
        refreshUav(activeUavId);
      }
    } catch (err) {
      console.error('[SimulationPage] Failed to inject fault:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to inject fault scenario.';
      setFaultErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsInjectingFault(false);
    }
  };

  const handleClearFault = async () => {
    setIsInjectingFault(true);
    setFaultErrorMsg(null);
    try {
      const payload = {
        uav_id: activeUavId,
        fault_type: 'NORMAL',
        severity: 0.0,
        degradation: 0.0,
      };
      const response = await simulationApi.injectFault(payload);
      setSimResult(normalizeSimulationState(response));
      setUavFaults((prev) => ({ ...prev, [activeUavId]: null }));
      if (typeof refreshUav === 'function') {
        refreshUav(activeUavId);
      }
    } catch (err) {
      console.error('[SimulationPage] Failed to clear fault:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to restore nominal state.';
      setFaultErrorMsg(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setIsInjectingFault(false);
    }
  };

  const isSimActive = Boolean(simResult);

  // Clear any previous false start timeout error once simulation telemetry is active
  useEffect(() => {
    if (isSimActive && errorMsg && errorMsg.toLowerCase().includes('timeout')) {
      setErrorMsg(null);
      setIsSimRunning(true);
    }
  }, [isSimActive, errorMsg]);

  const tel = simResult?.engine_telemetry || simResult?.telemetry || simResult || {};
  const currentFlightPhase = simResult?.flight_phase || tel.flight_phase || params.flightPhase;

  return (
    <div className="space-y-6">
      {/* 1. Page Header with Actions */}
      <PageHeader
        systemTag={`${activeUavId} // ENGINE SIMULATOR`}
        title="Mission & Engine Simulation"
        description={`Software-in-the-loop numerical simulation engine generating flight profiles, dynamic thermodynamic engine cycles, and synthetic telemetry for ${activeUavId}.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartSimulation}
              disabled={isStarting}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded ${
                isStarting
                  ? 'bg-sky-500/40 text-sky-200 cursor-wait'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 cursor-pointer shadow-sm active:translate-y-px transition-all'
              }`}
            >
              <Play className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
              <span>{isStarting ? 'INITIALIZING...' : 'START SIMULATION'}</span>
            </button>
            <button
              disabled
              title="STOP simulation is not configured"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50"
            >
              <Square className="w-3.5 h-3.5" />
              <span>STOP</span>
            </button>
          </div>
        }
      />

      {/* 2. Persistent Active UAV Context Header */}
      <div className="bg-[#0e1628]/95 border border-sky-500/40 rounded-lg p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-sky-400 font-bold uppercase">
              ACTIVE PROPULSION CONTEXT
            </div>
            <div className="text-lg md:text-xl font-black font-mono tracking-tight text-white flex items-center gap-2 mt-0.5">
              <span className="text-slate-200">SHOWING DATA FOR:</span>
              <span className="text-sky-400 underline decoration-sky-500/50 underline-offset-4 tracking-wide font-black">
                {activeUavId}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1 rounded bg-slate-800/90 text-slate-200 border border-slate-700/80 font-mono text-xs font-semibold">
            PHASE: {currentFlightPhase}
          </span>
          <span
            className={`px-3 py-1 rounded font-mono text-xs font-semibold border ${
              isSimActive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                isSimActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isSimActive ? 'SIMULATION RUNNING' : 'SIMULATION STANDBY'}
          </span>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-700">
            <span className="text-xs font-mono text-slate-400 font-medium">SWITCH UAV:</span>
            <select
              value={activeUavId}
              onChange={(e) => setActiveUavId(e.target.value)}
              className="bg-transparent text-slate-100 font-mono text-xs font-bold focus:outline-none cursor-pointer"
            >
              {(fleetUavIds || ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005']).map((id) => (
                <option key={id} value={id} className="bg-slate-900 text-slate-100">
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert if simulation start fails */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-300 font-mono text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Error starting simulation: {errorMsg}</span>
        </div>
      )}

      {/* 3. Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          title="Simulation State"
          status={isSimActive ? STATUS_TYPES.HEALTHY : STATUS_TYPES.IDLE}
          details={
            isSimActive
              ? `${activeUavId} // Status: ACTIVE // Mode: ${simResult.data_mode || 'SIMULATED'} // Engine: ${simResult.engine_id || `AERO-${activeUavId.replace('UAV-', '')}`} // RPM: ${Math.round(tel.rpm ?? 0)}`
              : 'Engine physics model standby. Configure parameters and click START SIMULATION.'
          }
          icon={Sliders}
        />
        <StatusCard
          title="Flight Profile Link"
          status={isSimActive ? STATUS_TYPES.HEALTHY : STATUS_TYPES.IDLE}
          details={
            isSimActive
              ? `Alt: ${Math.round(tel.altitude ?? params.altitude)}m // Thr: ${Math.round(tel.throttle ?? params.throttle)}% // IAS: ${params.indicatedAirspeed} kts // Phase: ${currentFlightPhase}`
              : `Target: ${params.altitude}m // Throttle: ${params.throttle}% // IAS: ${params.indicatedAirspeed} kts`
          }
          icon={Layers}
        />
        <StatusCard
          title="Fault Injection System"
          status={
            activeFault
              ? activeFault.severity === 'CRITICAL'
                ? STATUS_TYPES.CRITICAL
                : STATUS_TYPES.WARNING
              : STATUS_TYPES.HEALTHY
          }
          details={
            activeFault
              ? `ARMED [${activeFault.id}]: ${activeFault.name} // Severity: ${Math.round(activeFault.faultSeverity * 100)}% // Target: ${activeUavId}`
              : `All failure injection channels disabled for ${activeUavId} (Nominal Mode).`
          }
          icon={AlertTriangle}
        />
      </div>

      {/* 4. Live Simulated Telemetry Display (10 channels + Flight Phase) */}
      {isSimActive && (
        <SectionCard
          title={`Live Simulated Telemetry (${activeUavId})`}
          subtitle={`Continuous synthetic physical stream • Flight Phase: ${currentFlightPhase}`}
          action={
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY ACTIVE
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
            <TelemetryCard
              label="Engine Speed"
              code="RPM"
              value={tel.rpm !== undefined ? Math.round(tel.rpm) : '--'}
              unit="RPM"
              nominalRange="2000 - 2700"
              status={
                tel.rpm >= 2000 && tel.rpm <= 2700
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Cylinder Head Temp"
              code="CHT"
              value={tel.cht !== undefined ? Number(tel.cht).toFixed(1) : '--'}
              unit="°C"
              nominalRange="80 - 130"
              status={
                tel.cht <= 130
                  ? STATUS_TYPES.HEALTHY
                  : tel.cht <= 145
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.CRITICAL
              }
            />
            <TelemetryCard
              label="Exhaust Gas Temp"
              code="EGT"
              value={tel.egt !== undefined ? Number(tel.egt).toFixed(1) : '--'}
              unit="°C"
              nominalRange="700 - 850"
              status={
                tel.egt >= 680 && tel.egt <= 850
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Oil Lubrication Press"
              code="OIL_P"
              value={tel.oil_pressure !== undefined ? Number(tel.oil_pressure).toFixed(2) : '--'}
              unit="bar"
              nominalRange="2.0 - 5.0"
              status={
                tel.oil_pressure >= 2.0 && tel.oil_pressure <= 5.0
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Oil Temperature"
              code="OIL_T"
              value={tel.oil_temperature !== undefined ? Number(tel.oil_temperature).toFixed(1) : '--'}
              unit="°C"
              nominalRange="70 - 105"
              status={
                tel.oil_temperature >= 65 && tel.oil_temperature <= 105
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Chassis Vibration"
              code="VIB"
              value={tel.vibration !== undefined ? Number(tel.vibration).toFixed(2) : '--'}
              unit="g"
              nominalRange="< 5.0"
              status={
                tel.vibration < 5.0
                  ? STATUS_TYPES.HEALTHY
                  : tel.vibration < 8.0
                  ? STATUS_TYPES.WARNING
                  : STATUS_TYPES.CRITICAL
              }
            />
            <TelemetryCard
              label="Fuel Flow Rate"
              code="FF"
              value={tel.fuel_flow !== undefined ? Number(tel.fuel_flow).toFixed(1) : '--'}
              unit="L/h"
              nominalRange="15.0 - 38.0"
              status={
                tel.fuel_flow >= 15.0 && tel.fuel_flow <= 38.0
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Engine Load"
              code="LOAD"
              value={tel.engine_load !== undefined ? Math.round(tel.engine_load) : '--'}
              unit="%"
              nominalRange="40 - 85"
              status={
                tel.engine_load <= 85
                  ? STATUS_TYPES.HEALTHY
                  : STATUS_TYPES.WARNING
              }
            />
            <TelemetryCard
              label="Flight Altitude"
              code="ALT"
              value={tel.altitude !== undefined ? Math.round(tel.altitude) : (params.altitude ? Math.round(params.altitude) : '--')}
              unit="m"
              nominalRange="0 - 8000"
              status={STATUS_TYPES.HEALTHY}
            />
            <TelemetryCard
              label="Throttle Lever"
              code="THR"
              value={tel.throttle !== undefined ? Math.round(tel.throttle) : (params.throttle ? Math.round(params.throttle) : '--')}
              unit="%"
              nominalRange="0 - 100"
              status={STATUS_TYPES.HEALTHY}
            />
          </div>
        </SectionCard>
      )}

      {/* 5. Main Form & Fault Injection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mission Flight Profile Parameters (Real Form Inputs) */}
        <SectionCard
          title="Mission Flight Profile Configuration"
          subtitle="Define operational environmental and throttle conditions for simulation engine"
        >
          <div className="space-y-4 font-mono text-xs text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Target Altitude */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  TARGET ALTITUDE (METERS)
                </label>
                <input
                  type="number"
                  min="0"
                  max="8000"
                  step="100"
                  value={params.altitude}
                  onChange={(e) => handleInputChange('altitude', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Operational ceiling: 8,000 m (~26,000 ft)</p>
              </div>

              {/* Throttle Lever Angle */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  THROTTLE POSITION (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={params.throttle}
                    onChange={(e) => handleInputChange('throttle', e.target.value)}
                    className="flex-1 accent-sky-400 cursor-pointer"
                  />
                  <span className="font-bold text-sky-400 font-mono w-10 text-right">
                    {params.throttle}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Full Authority Digital Engine Control</p>
              </div>

              {/* Indicated Airspeed */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  INDICATED AIRSPEED (KTS)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  step="5"
                  value={params.indicatedAirspeed}
                  onChange={(e) => handleInputChange('indicatedAirspeed', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Nominal loiter: 75 - 90 kts</p>
              </div>

              {/* Flight Phase */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  FLIGHT PHASE
                </label>
                <select
                  value={params.flightPhase}
                  onChange={(e) => handleInputChange('flightPhase', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full cursor-pointer"
                >
                  {FLIGHT_PHASES.map((phase) => (
                    <option key={phase} value={phase} className="bg-slate-900 text-slate-100">
                      {phase}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Operational state machine mode</p>
              </div>

              {/* Ambient Temperature */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  AMBIENT TEMPERATURE (°C)
                </label>
                <input
                  type="number"
                  min="-25"
                  max="50"
                  step="1"
                  value={params.ambientTemperature}
                  onChange={(e) => handleInputChange('ambientTemperature', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Standard ISA baseline: +15°C</p>
              </div>

              {/* Relative Humidity */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  RELATIVE HUMIDITY (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={params.humidity}
                  onChange={(e) => handleInputChange('humidity', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Atmospheric moisture content</p>
              </div>

              {/* Wind Speed */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  WIND SPEED (M/S)
                </label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="1"
                  value={params.windSpeed}
                  onChange={(e) => handleInputChange('windSpeed', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Cross/head wind vector magnitude</p>
              </div>

              {/* Mission Duration */}
              <div className="p-3 rounded bg-slate-950/60 border border-slate-800">
                <label className="text-slate-400 block mb-1 font-medium">
                  MISSION DURATION (HOURS)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="48"
                  step="0.5"
                  value={params.missionDurationHours}
                  onChange={(e) => handleInputChange('missionDurationHours', e.target.value)}
                  className="bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 font-mono text-sm text-slate-100 font-bold focus:border-sky-500 focus:outline-none w-full"
                />
                <p className="text-[10px] text-slate-500 mt-1">Target operational loiter window</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleStartSimulation}
                disabled={isStarting}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded ${
                  isStarting
                    ? 'bg-sky-500/40 text-sky-200 cursor-wait'
                    : 'bg-sky-600 hover:bg-sky-500 text-white border border-sky-400 cursor-pointer shadow transition-all'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                <span>{isStarting ? 'INITIALIZING...' : 'APPLY & START SIMULATION'}</span>
              </button>
            </div>
          </div>
        </SectionCard>

        {/* Fault Injection Scenarios */}
        <SectionCard
          title="Fault Injection Scenarios"
          subtitle={`Inject synthetic component degradation modes into the telemetry stream for ${activeUavId}`}
          action={
            activeFault ? (
              <button
                onClick={handleClearFault}
                disabled={isInjectingFault}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/80 cursor-pointer shadow-sm transition-all"
              >
                <span>RESTORE NOMINAL (DISARM)</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono text-slate-400">
                STATUS: NOMINAL ENGINE
              </span>
            )
          }
        >
          {faultErrorMsg && (
            <div className="mb-3 p-3 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Fault Error: {faultErrorMsg}</span>
            </div>
          )}

          <div className="space-y-3 font-mono text-xs">
            {FAULT_DEFINITIONS.map((fault) => {
              const isThisArmed = activeFaultId === fault.id;
              return (
                <div
                  key={fault.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded transition-all gap-3 ${
                    isThisArmed
                      ? fault.severity === 'CRITICAL'
                        ? 'bg-rose-950/40 border border-rose-500/60 shadow-sm'
                        : 'bg-amber-950/40 border border-amber-500/60 shadow-sm'
                      : 'bg-slate-950/60 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          isThisArmed
                            ? fault.severity === 'CRITICAL'
                              ? 'bg-rose-900/80 text-rose-200 border border-rose-700'
                              : 'bg-amber-900/80 text-amber-200 border border-amber-700'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {fault.id}
                      </span>
                      <span className="font-semibold text-slate-200">{fault.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          fault.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {fault.severity}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      TARGET: {fault.targetComponent} • {fault.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isThisArmed
                          ? fault.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border-rose-600/80 font-bold animate-pulse'
                            : 'bg-amber-950 text-amber-300 border-amber-600/80 font-bold animate-pulse'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {isThisArmed ? 'ARMED: ACTIVE' : 'ARMED: OFF'}
                    </span>

                    {isThisArmed ? (
                      <button
                        onClick={handleClearFault}
                        disabled={isInjectingFault}
                        className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer shadow transition-all"
                      >
                        DISARM
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApplyFault(fault)}
                        disabled={isInjectingFault}
                        className={`px-3 py-1 text-[11px] font-bold rounded cursor-pointer shadow transition-all border ${
                          fault.severity === 'CRITICAL'
                            ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500'
                            : 'bg-amber-700 hover:bg-amber-600 text-white border-amber-500'
                        }`}
                      >
                        {isInjectingFault ? 'INJECTING...' : 'ARM / APPLY'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
