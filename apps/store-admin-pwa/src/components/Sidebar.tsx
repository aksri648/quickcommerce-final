import React from 'react';
import { NavLink } from 'react-router-dom';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import {
  LayoutDashboard,
  Clock,
  Layers,
  ShoppingBag,
  Boxes,
  Truck,
  FileText,
  Store,
  LogOut,
  Zap,
} from 'lucide-react';
import { cn } from '@quickcommerce/ui';

export const Sidebar: React.FC = () => {
  const { store, user, logout } = useStoreAdminAuth();

  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/slot-board', label: 'Slot Board', icon: Clock },
    { to: '/batch-kanban', label: 'Batch Board', icon: Layers },
    { to: '/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/inventory', label: 'Inventory', icon: Boxes },
    { to: '/drivers', label: 'Drivers & Fleet', icon: Truck },
    { to: '/invoices', label: 'Invoices', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-amber-300 font-black shadow-xs">
            <Zap className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">Store Console</h1>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">QuickBlink Operations</span>
          </div>
        </div>

        {/* Store Info Banner */}
        <div className="p-3 rounded-2xl bg-slate-800/70 border border-slate-750 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
            <Store className="h-3.5 w-3.5 text-emerald-400" />
            <span className="uppercase text-[10px] tracking-wider">Serving Hub</span>
          </div>
          <p className="font-bold text-white leading-tight">{store?.name || 'QuickBlink Store'}</p>
          <span className="inline-block text-[10px] text-emerald-400 font-mono">
            {store?.code} • {store?.city}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <div>
            <span className="font-bold text-white block truncate">{user?.name || 'Priya Patel'}</span>
            <span className="text-[10px] text-slate-400">Store Admin</span>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
