import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import WatermarkBackground from './components/WatermarkBackground';
import { TelemetryProvider } from './context/TelemetryContext';
import { FleetProvider } from './context/FleetContext';

// Page Views
import DashboardPage from './pages/DashboardPage';
import FleetPage from './pages/FleetPage';
import UavTrackingPage from './pages/UavTrackingPage';
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
    <FleetProvider>
      <TelemetryProvider>
        <div className="relative flex h-screen bg-[#090d16] text-slate-100 overflow-hidden font-sans">
          {/* Subtle Defence / Aerospace Watermark Layer */}
          <WatermarkBackground />

          {/* Sidebar Navigation */}
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Main Content Area */}
          <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Navigation Bar */}
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

            {/* Dynamic Route Content */}
            <main className="flex-1 overflow-y-auto scroll-smooth px-4 py-3 md:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto pb-4">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/fleet" element={<FleetPage />} />
                  <Route path="/uav-tracking" element={<UavTrackingPage />} />
                  <Route path="/simulation" element={<SimulationPage />} />
                  <Route path="/digital-twin" element={<DigitalTwinPage />} />
                  <Route path="/monitoring" element={<MonitoringPage />} />
                  <Route path="/ai-analysis" element={<AiAnalysisPage />} />
                  <Route path="/what-if" element={<WhatIfPage />} />
                  <Route path="/mission" element={<MissionPage />} />
                  <Route path="/mission-risk" element={<MissionPage />} />
                  <Route path="/maintenance" element={<MaintenancePage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/telemetry-reports" element={<ReportsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </TelemetryProvider>
    </FleetProvider>
  );
}
