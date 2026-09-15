import React from 'react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import MetricCard from '../components/MetricCard';
import { STATUS_TYPES } from '../utils/status';
import { FileText, Download, Printer, Filter, Calendar } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        systemTag="AEROTWIN // MISSION REPORTS"
        title="Flight & Maintenance Reports"
        description="Comprehensive post-flight propulsion logs, engine health audits, and condition-based maintenance certification records."
        actions={
          <div className="flex items-center gap-2">
            <button
              disabled
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 cursor-not-allowed opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT FLIGHT LOG</span>
            </button>
          </div>
        }
      />

      {/* Summary report metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Recorded Missions"
          value="0"
          unit="sorties"
          status={STATUS_TYPES.IDLE}
          subtext="Telemetry Database"
          icon={FileText}
        />
        <MetricCard
          title="Logged Engine Hours"
          value="0.0"
          unit="hrs"
          status={STATUS_TYPES.IDLE}
          subtext="Simulated Flight History"
          icon={Calendar}
        />
        <MetricCard
          title="Detected Anomalies"
          value="0"
          unit="events"
          status={STATUS_TYPES.IDLE}
          subtext="Total Historical Flags"
          icon={Filter}
        />
        <MetricCard
          title="Maintenance Certifications"
          value="CURRENT"
          unit=""
          status={STATUS_TYPES.IDLE}
          subtext="Airworthiness Readiness"
          icon={Printer}
        />
      </div>

      <SectionCard
        title="Mission Sortie Flight Log"
        subtitle="Historical flight telemetry sessions archived in SQLite database"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">SORTIE ID</th>
                <th className="py-2.5 px-3">DATE / TIME</th>
                <th className="py-2.5 px-3">DURATION</th>
                <th className="py-2.5 px-3">PEAK CHT</th>
                <th className="py-2.5 px-3">PEAK EGT</th>
                <th className="py-2.5 px-3">MIN OIL P</th>
                <th className="py-2.5 px-3">HEALTH SCORE</th>
                <th className="py-2.5 px-3 text-right">REPORT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No mission sorties logged yet. Run a flight simulation to generate post-mission telemetry reports.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
