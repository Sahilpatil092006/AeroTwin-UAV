/**
 * AeroTwin-UAV Flight Sortie Audit Export Utility
 * ===============================================
 * Generates and downloads persistent CSV and professional PDF reports
 * for a selected historical flight session and archived telemetry.
 */

import { jsPDF } from 'jspdf';

/**
 * Exports the selected historical sortie and its stored telemetry to a CSV file.
 * @param {Object} sortie - Flight session metadata
 * @param {Array} samples - Persisted telemetry records
 */
export function exportSortieToCsv(sortie, samples = []) {
  if (!sortie) return;

  const lines = [];

  // Metadata Section
  lines.push('# ============================================================');
  lines.push('# AEROTWIN-UAV // FLIGHT SORTIE AUDIT REPORT');
  lines.push('# ============================================================');
  lines.push('# GENERATED: ' + new Date().toISOString());
  lines.push('# DATA SOURCE: PERSISTENT SQLITE TELEMETRY ARCHIVE');
  lines.push('#');
  lines.push('# UAV ID,Sortie ID,Status,Flight Phase,Start Time,End Time,Total Samples,Peak CHT (C),Peak EGT (C),Min Oil Pressure (bar),Health Score (%),Mission Risk');
  
  const startTime = sortie.start_time || 'N/A';
  const endTime = sortie.end_time || 'ACTIVE / IN-PROGRESS';
  const peakCht = sortie.peak_cht !== undefined ? sortie.peak_cht.toFixed(1) : 'N/A';
  const peakEgt = sortie.peak_egt !== undefined ? sortie.peak_egt.toFixed(1) : 'N/A';
  const minOil = sortie.min_oil_pressure !== undefined ? sortie.min_oil_pressure.toFixed(2) : 'N/A';
  const health = sortie.health_score !== undefined ? sortie.health_score.toFixed(1) : 'N/A';
  const risk = sortie.mission_risk || 'N/A';
  const totalSamples = sortie.total_samples || samples.length;

  lines.push(
    `"${sortie.uav_id}","${sortie.sortie_id}","${sortie.status}","${sortie.flight_phase}","${startTime}","${endTime}",${totalSamples},${peakCht},${peakEgt},${minOil},${health},"${risk}"`
  );

  lines.push('#');
  lines.push('# ============================================================');
  lines.push('# STORED TELEMETRY SAMPLES');
  lines.push('# ============================================================');
  lines.push('Sample ID,Timestamp,Flight Phase,RPM,CHT (C),EGT (C),Oil Pressure (bar),Oil Temperature (C),Vibration (g),Fuel Flow (L/h),Throttle (%),Engine Load (%),Health Score (%),Mission Risk');

  for (const s of samples) {
    const sId = s.id || '';
    const ts = s.timestamp || '';
    const phase = s.flight_phase || '';
    const rpm = s.rpm !== undefined ? s.rpm.toFixed(1) : '';
    const cht = s.cht !== undefined ? s.cht.toFixed(1) : '';
    const egt = s.egt !== undefined ? s.egt.toFixed(1) : '';
    const oilP = s.oil_pressure !== undefined ? s.oil_pressure.toFixed(2) : '';
    const oilT = s.oil_temperature !== undefined ? s.oil_temperature.toFixed(1) : '';
    const vib = s.vibration !== undefined ? s.vibration.toFixed(2) : '';
    const fuel = s.fuel_flow !== undefined ? s.fuel_flow.toFixed(1) : '';
    const throttle = s.throttle !== undefined ? s.throttle.toFixed(1) : '';
    const load = s.engine_load !== undefined ? s.engine_load.toFixed(1) : throttle;
    const hScore = s.health_score !== undefined ? s.health_score.toFixed(1) : '';
    const mRisk = s.mission_risk || '';

    lines.push(
      `${sId},"${ts}","${phase}",${rpm},${cht},${egt},${oilP},${oilT},${vib},${fuel},${throttle},${load},${hScore},"${mRisk}"`
    );
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${sortie.sortie_id || sortie.uav_id || 'sortie'}_telemetry_report.csv`;

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a clean, professional PDF audit report for the selected sortie.
 * @param {Object} sortie - Flight session metadata
 * @param {Array} samples - Persisted telemetry records
 */
export function exportSortieToPdf(sortie, samples = []) {
  if (!sortie) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 15;

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Cyan Accent Line
  doc.setFillColor(6, 182, 212); // cyan-500
  doc.rect(0, 32, pageWidth, 1.5, 'F');

  // Header Title & System Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 182, 212); // cyan-400
  doc.text('AEROTWIN-UAV // AUTONOMOUS PROPULSION TWIN SYSTEM', 14, 12);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('FLIGHT SORTIE AUDIT REPORT', 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`VEHICLE: ${sortie.uav_id}  |  SORTIE ID: ${sortie.sortie_id}  |  ARCHIVE: SQLITE PERSISTENT`, 14, 27);

  // Status Badge on Top Right
  const riskColor = sortie.mission_risk === 'HIGH' ? [244, 63, 94] : sortie.mission_risk === 'MEDIUM' ? [245, 158, 11] : [16, 185, 129];
  doc.setFillColor(...riskColor);
  doc.roundedRect(pageWidth - 45, 11, 31, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`RISK: ${sortie.mission_risk || 'LOW'}`, pageWidth - 42, 16);

  currentY = 42;

  // Section 1: Mission & Session Metadata Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('1. MISSION & SORTIE METADATA', 14, currentY);
  currentY += 4;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const col1 = 18;
  const col2 = 65;
  const col3 = 115;
  const col4 = 160;

  // Row 1
  doc.text('UAV Identifier:', col1, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sortie.uav_id || 'N/A', col1 + 25, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Sortie ID:', col2, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sortie.sortie_id || 'N/A', col2 + 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Flight Phase:', col3, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sortie.flight_phase || 'CRUISE', col3 + 22, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Status:', col4, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(sortie.status || 'ACTIVE', col4 + 14, currentY + 7);

  // Row 2
  const startTimeStr = sortie.start_time ? new Date(sortie.start_time).toLocaleString() : 'N/A';
  const endTimeStr = sortie.end_time ? new Date(sortie.end_time).toLocaleString() : 'ACTIVE / IN-PROGRESS';
  const totalSamplesCount = String(sortie.total_samples || samples.length);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Start Time:', col1, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(startTimeStr, col1 + 20, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('End Time:', col3, currentY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(endTimeStr, col3 + 18, currentY + 16);

  currentY += 32;

  // Section 2: Condition & Thermal Extrema Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. THERMAL, FLUID & CERTIFICATION EXTREMA', 14, currentY);
  currentY += 4;

  const boxWidth = (pageWidth - 28 - 12) / 5;
  const metrics = [
    { label: 'PEAK CHT', value: `${sortie.peak_cht !== undefined ? sortie.peak_cht.toFixed(1) : '--'} °C`, highlight: sortie.peak_cht > 130 },
    { label: 'PEAK EGT', value: `${sortie.peak_egt !== undefined ? sortie.peak_egt.toFixed(1) : '--'} °C`, highlight: sortie.peak_egt > 850 },
    { label: 'MIN OIL PRESS', value: `${sortie.min_oil_pressure !== undefined ? sortie.min_oil_pressure.toFixed(2) : '--'} bar`, highlight: sortie.min_oil_pressure < 2.0 },
    { label: 'HEALTH SCORE', value: `${sortie.health_score !== undefined ? sortie.health_score.toFixed(1) : '--'} %`, highlight: sortie.health_score < 70 },
    { label: 'TOTAL SAMPLES', value: `${totalSamplesCount}`, highlight: false },
  ];

  metrics.forEach((m, idx) => {
    const xPos = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(xPos, currentY, boxWidth, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, xPos + 3, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(m.highlight ? 225 : 15, m.highlight ? 29 : 23, m.highlight ? 72 : 42);
    doc.text(m.value, xPos + 3, currentY + 12);
  });

  currentY += 24;

  // Section 3: Persisted Telemetry Stream Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`3. PERSISTED TELEMETRY STREAM ARCHIVE (${samples.length} SAMPLES)`, 14, currentY);
  currentY += 4;

  // Table Header
  const headers = ['Time', 'Phase', 'RPM', 'CHT', 'EGT', 'Oil P', 'Oil T', 'Vib', 'Fuel', 'Load'];
  const colWidths = [28, 20, 16, 16, 16, 16, 16, 16, 16, 24];
  const startX = 14;

  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(startX, currentY, pageWidth - 28, 6.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  let curX = startX + 2;
  headers.forEach((h, idx) => {
    doc.text(h, curX, currentY + 4.5);
    curX += colWidths[idx];
  });

  currentY += 6.5;

  // Table Data Rows (sample up to 25 rows for clean 1-2 page representation)
  const rowsToPrint = samples.slice(0, 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  rowsToPrint.forEach((row, rIdx) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 15;
    }

    const isEven = rIdx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(startX, currentY, pageWidth - 28, 5.5, 'F');

    doc.setTextColor(51, 65, 85);

    const timeStr = row.timestamp ? String(row.timestamp).split('T')[1]?.substring(0, 8) || String(row.timestamp) : '--';
    const rowValues = [
      timeStr,
      row.flight_phase || 'CRUISE',
      row.rpm !== undefined ? row.rpm.toFixed(0) : '--',
      row.cht !== undefined ? `${row.cht.toFixed(1)}°` : '--',
      row.egt !== undefined ? `${row.egt.toFixed(1)}°` : '--',
      row.oil_pressure !== undefined ? row.oil_pressure.toFixed(2) : '--',
      row.oil_temperature !== undefined ? `${row.oil_temperature.toFixed(1)}°` : '--',
      row.vibration !== undefined ? row.vibration.toFixed(2) : '--',
      row.fuel_flow !== undefined ? row.fuel_flow.toFixed(1) : '--',
      `${row.engine_load !== undefined ? row.engine_load.toFixed(0) : row.throttle !== undefined ? row.throttle.toFixed(0) : '--'}%`,
    ];

    let rowX = startX + 2;
    rowValues.forEach((val, cIdx) => {
      doc.text(val, rowX, currentY + 3.8);
      rowX += colWidths[cIdx];
    });

    currentY += 5.5;
  });

  // Footer on Page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('CONFIDENTIAL // AEROTWIN-UAV CERTIFIED PROPULSION TELEMETRY ARCHIVE', 14, pageHeight - 8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 60, pageHeight - 8);

  const pdfFilename = `${sortie.sortie_id || sortie.uav_id || 'sortie'}_audit_report.pdf`;
  doc.save(pdfFilename);
}
