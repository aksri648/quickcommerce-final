import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { SlotBoardPage } from './pages/SlotBoardPage';
import { BatchKanbanPage } from './pages/BatchKanbanPage';
import { OrdersPage } from './pages/OrdersPage';
import { InventoryPage } from './pages/InventoryPage';
import { DriversPage } from './pages/DriversPage';
import { InvoicesPage } from './pages/InvoicesPage';

export const App: React.FC = () => {
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
