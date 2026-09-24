import { jsPDF } from 'jspdf';
import fs from 'fs';
import assert from 'assert';

const sortie = {
  uav_id: 'UAV-001',
  sortie_id: 'SRT-UAV-001-20260924',
  status: 'ACTIVE',
  flight_phase: 'CRUISE',
  start_time: '2026-09-24T17:55:01.896835',
  end_time: null,
  total_samples: 428,
  peak_cht: 142.4,
  peak_egt: 855.2,
  min_oil_pressure: 1.48,
  health_score: 59.6,
  mission_risk: 'HIGH',
};

const samples = [
  { id: 1, sortie_id: 'SRT-UAV-001-20260924', uav_id: 'UAV-001', timestamp: '2026-09-24T17:55:02', flight_phase: 'CRUISE', rpm: 2400.0, cht: 98.5, egt: 795.0, oil_pressure: 2.85, oil_temperature: 75.0, vibration: 2.30, fuel_flow: 25.0, throttle: 75.0, engine_load: 65.0, health_score: 59.6, mission_risk: 'HIGH' },
  { id: 2, sortie_id: 'SRT-UAV-001-20260924', uav_id: 'UAV-001', timestamp: '2026-09-24T17:55:03', flight_phase: 'CRUISE', rpm: 2402.0, cht: 98.7, egt: 796.0, oil_pressure: 2.84, oil_temperature: 75.2, vibration: 2.32, fuel_flow: 25.1, throttle: 75.0, engine_load: 65.1, health_score: 59.6, mission_risk: 'HIGH' }
];

// 1. Generate CSV text
const lines = [
  '# AEROTWIN-UAV // FLIGHT SORTIE AUDIT REPORT',
  '# UAV ID,Sortie ID,Status,Flight Phase,Start Time,End Time,Total Samples,Peak CHT (C),Peak EGT (C),Min Oil Pressure (bar),Health Score (%),Mission Risk',
  `"${sortie.uav_id}","${sortie.sortie_id}","${sortie.status}","${sortie.flight_phase}","${sortie.start_time}","ACTIVE / IN-PROGRESS",${sortie.total_samples},${sortie.peak_cht},${sortie.peak_egt},${sortie.min_oil_pressure},${sortie.health_score},"${sortie.mission_risk}"`,
  '# STORED TELEMETRY SAMPLES',
  'Sample ID,Timestamp,Flight Phase,RPM,CHT (C),EGT (C),Oil Pressure (bar),Oil Temperature (C),Vibration (g),Fuel Flow (L/h),Throttle (%),Engine Load (%),Health Score (%),Mission Risk',
];

for (const s of samples) {
  lines.push(`${s.id},"${s.timestamp}","${s.flight_phase}",${s.rpm},${s.cht},${s.egt},${s.oil_pressure},${s.oil_temperature},${s.vibration},${s.fuel_flow},${s.throttle},${s.engine_load},${s.health_score},"${s.mission_risk}"`);
}

const csvContent = lines.join('\n');
assert(csvContent.includes('SRT-UAV-001-20260924'));
assert(csvContent.includes('142.4'));
assert(csvContent.includes('1.48'));
console.log('✓ CSV generation and content verified successfully.');

// 2. Generate PDF document with jsPDF
const doc = new jsPDF();
doc.text('AEROTWIN-UAV // FLIGHT SORTIE AUDIT REPORT', 14, 20);
doc.text(`Sortie ID: ${sortie.sortie_id}`, 14, 30);
doc.text(`Vehicle: ${sortie.uav_id}`, 14, 40);
doc.text(`Peak CHT: ${sortie.peak_cht}°C  |  Peak EGT: ${sortie.peak_egt}°C  |  Min Oil: ${sortie.min_oil_pressure} bar`, 14, 50);

const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
assert(pdfBuffer.length > 500, 'PDF buffer must contain valid document bytes');
console.log(`✓ PDF generation verified successfully (${pdfBuffer.length} bytes generated).`);
