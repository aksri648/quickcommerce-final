import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage';
import { StoresManagerPage } from './pages/StoresManagerPage';
import { GlobalOrdersPage } from './pages/GlobalOrdersPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { useGodAdminAuth } from './context/GodAdminAuthContext';
import { UserRole } from '@quickcommerce/shared';

export const App: React.FC = () => {
  const { user, isLoading } = useGodAdminAuth();

  if (isLoading) return <div className="p-8 text-white">Loading...</div>;
  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return <div className="p-8 text-white">Unauthorized Access</div>;
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<ExecutiveDashboardPage />} />
          <Route path="/stores" element={<StoresManagerPage />} />
          <Route path="/global-orders" element={<GlobalOrdersPage />} />
          <Route path="/system-health" element={<SystemHealthPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Routes>
      </main>
    </div>
  );
};
