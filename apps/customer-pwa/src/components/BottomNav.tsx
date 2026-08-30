import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Clock, User } from 'lucide-react';
import { cn } from '@quickcommerce/ui';

export const BottomNav: React.FC = () => {
  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/catalog', label: 'Categories', icon: LayoutGrid },
    { to: '/orders', label: 'Orders', icon: Clock },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 sm:hidden">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto px-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
                  isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
