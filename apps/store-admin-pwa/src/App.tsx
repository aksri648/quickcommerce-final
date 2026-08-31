import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SlotBoardPage } from './pages/SlotBoardPage';
import { BatchKanbanPage } from './pages/BatchKanbanPage';
import { OrdersPage } from './pages/OrdersPage';
import { InventoryPage } from './pages/InventoryPage';
import { DriversPage } from './pages/DriversPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { useStoreAdminAuth } from './context/StoreAdminAuthContext';
import { UserRole } from '@quickcommerce/shared';

export const App: React.FC = () => {
  const { user, isLoading } = useStoreAdminAuth();

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user || user.role !== UserRole.STORE_ADMIN) {
    return <div className="p-8">Unauthorized Access</div>;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/slot-board" element={<SlotBoardPage />} />
          <Route path="/batch-kanban" element={<BatchKanbanPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Routes>
      </main>
    </div>
  );
};
