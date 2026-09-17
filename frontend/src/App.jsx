import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { TelemetryProvider } from './context/TelemetryContext';

// Page Views
import DashboardPage from './pages/DashboardPage';
import SimulationPage from './pages/SimulationPage';
import DigitalTwinPage from './pages/DigitalTwinPage';
import MonitoringPage from './pages/MonitoringPage';
import AiAnalysisPage from './pages/AiAnalysisPage';
import MissionPage from './pages/MissionPage';
import WhatIfPage from './pages/WhatIfPage';
import MaintenancePage from './pages/MaintenancePage';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <TelemetryProvider>
      <div className="flex h-screen bg-[#06090e] text-slate-100 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Navigation Bar */}
          <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

          {/* Dynamic Route Content */}
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-10">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/simulation" element={<SimulationPage />} />
                <Route path="/digital-twin" element={<DigitalTwinPage />} />
                <Route path="/monitoring" element={<MonitoringPage />} />
                <Route path="/ai-analysis" element={<AiAnalysisPage />} />
                <Route path="/what-if" element={<WhatIfPage />} />
                <Route path="/mission" element={<MissionPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </TelemetryProvider>
  );
}
