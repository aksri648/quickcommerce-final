import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { DriverBatchPage } from './pages/DriverBatchPage';
import { DriverOrderDeliveryPage } from './pages/DriverOrderDeliveryPage';
import { DriverHistoryPage } from './pages/DriverHistoryPage';
import { DriverLoginPage } from './pages/DriverLoginPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Routes>
        <Route path="/" element={<DriverDashboardPage />} />
        <Route path="/batch/:id" element={<DriverBatchPage />} />
        <Route path="/delivery/:orderId" element={<DriverOrderDeliveryPage />} />
        <Route path="/history" element={<DriverHistoryPage />} />
        <Route path="/login" element={<DriverLoginPage />} />
      </Routes>
    </div>
  );
};
