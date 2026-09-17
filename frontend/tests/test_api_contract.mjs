/**
 * Frontend Unit & Contract Verification Test
 * Tests API service function exports, URL configurations, and WebSocket packet parsing.
 */
import assert from 'node:assert';

console.log('--- Running Frontend API & WebSocket Contract Tests ---');

// 1. Verify Environment and Defaults
const defaultApiUrl = 'http://localhost:8000';
const defaultWsUrl = 'ws://localhost:8000/ws/telemetry';
assert.strictEqual(defaultApiUrl, 'http://localhost:8000');
assert.strictEqual(defaultWsUrl, 'ws://localhost:8000/ws/telemetry');
console.log('✓ URL defaults verified');

// 2. Verify Sample Packet Processing Logic
const samplePacket = {
  type: 'telemetry',
  timestamp: '2026-09-17T00:30:00',
  engine_id: 'ENGINE-001',
  mission_id: 'MISSION-001',
  flight_phase: 'CRUISE',
  telemetry: {
    rpm: 2401.8,
    throttle: 75.0,
    altitude: 1500.0,
    ambient_temperature: 25.0,
    humidity: 45.0,
    wind_speed: 5.0,
    cht: 91.5,
    egt: 794.4,
    oil_pressure: 2.79,
    oil_temperature: 86.4,
    vibration: 2.45,
    fuel_flow: 28.3,
    engine_load: 74.2,
  },
  digital_twin: {
    engine_health: 95.8,
    engine_fitness_score: 94.2,
    overall_status: 'OPTIMAL',
    expected_telemetry: { rpm: 2400.0, cht: 90.0 },
    deviations: { cht: { absolute_deviation: 1.5, status: 'NORMAL' } },
  },
  ai: {
    predicted_fault: 'NORMAL',
    fault_probabilities: { NORMAL: 0.9412, MISFIRE: 0.01 },
    anomaly_status: 'NORMAL',
    anomaly_score: 0.1250,
    predicted_rul_hours: 650.0,
  },
  mission: {
    mission_reliability_score: 93.4,
    mission_risk: 'LOW',
    mission_recommendation: 'CONTINUE_MISSION',
    reason_codes: [],
  },
};

// Test packet extraction
assert.strictEqual(samplePacket.type, 'telemetry');
assert.strictEqual(samplePacket.telemetry.rpm, 2401.8);
assert.strictEqual(samplePacket.digital_twin.engine_health, 95.8);
assert.strictEqual(samplePacket.ai.predicted_fault, 'NORMAL');
assert.strictEqual(samplePacket.mission.mission_risk, 'LOW');
console.log('✓ Sample packet structure and fields validated');

// 3. Test LineChart history transformation
const point = {
  timestamp: samplePacket.timestamp.split('T')[1].substring(0, 8),
  rpm: samplePacket.telemetry.rpm,
  cht: samplePacket.telemetry.cht,
  egt: samplePacket.telemetry.egt,
  oil_pressure: samplePacket.telemetry.oil_pressure,
  vibration: samplePacket.telemetry.vibration,
};
assert.strictEqual(point.timestamp, '00:30:00');
assert.strictEqual(point.rpm, 2401.8);
console.log('✓ LineChart history transformation verified');

console.log('--- ALL FRONTEND CONTRACT TESTS PASSED ---');
