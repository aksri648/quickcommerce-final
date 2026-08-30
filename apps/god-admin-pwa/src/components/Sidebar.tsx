import React from 'react';
import { NavLink } from 'react-router-dom';
import { useGodAdminAuth } from '../context/GodAdminAuthContext';
import {
  Activity,
  Store,
  Globe,
  Database,
  ShieldAlert,
  LogOut,
  Zap,
  Server,
} from 'lucide-react';
import { cn } from '@quickcommerce/ui';

export const Sidebar: React.FC = () => {
  const { user, logout } = useGodAdminAuth();

  const links = [
    { to: '/', label: 'Executive Platform KPIs', icon: Activity },
    { to: '/stores', label: 'Dark Stores Network', icon: Store },
    { to: '/global-orders', label: 'Global Orders & Slots', icon: Globe },
    { to: '/system-health', label: 'Queues & Outbox Health', icon: Server },
    { to: '/audit-logs', label: 'Audit Security Logs', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="p-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-xs">
            <Zap className="h-5 w-5 fill-amber-300 text-amber-300" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">God Console</h1>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Multi-Store SaaS</span>
          </div>
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
                      ? 'bg-indigo-600 text-white shadow-xs'
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
            <span className="font-bold text-white block truncate">{user?.name || 'Super Admin'}</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase">SUPER ADMIN</span>
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
