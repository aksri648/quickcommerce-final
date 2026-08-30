import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from '@quickcommerce/ui';
import { User, MapPin, Store, ShieldCheck, LogOut, Phone, Mail } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout, loginAsDemo } = useAuth();
  const { selectedStore } = useCart();

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4 space-y-4">
      <h2 className="text-lg font-black text-slate-900">Your Profile</h2>

      {/* User Info Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-xl">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-slate-900 truncate">{user?.name || 'Customer'}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Mail className="h-3 w-3" /> {user?.email}
          </p>
          {user?.phone && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {user?.phone}
            </p>
          )}
        </div>
      </div>

      {/* Selected Store Setting */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-emerald-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Serving Store</h4>
        </div>
        <div>
          <h5 className="text-sm font-bold text-slate-900">{selectedStore?.name || 'QuickBlink Indiranagar'}</h5>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedStore?.address}, {selectedStore?.city} • {selectedStore?.openingTime}–{selectedStore?.closingTime}
          </p>
        </div>
      </div>

      {/* Customer Guarantee */}
      <div className="p-4 rounded-3xl bg-emerald-50/60 border border-emerald-100 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
          <ShieldCheck className="h-4 w-4" /> QuickCommerce Quality Promise
        </div>
        <p className="text-[11px] text-emerald-700 leading-relaxed">
          100% fresh groceries batched & delivered in 3-hour windows. No hidden fees. Pay cash on delivery only after verified OTP entry.
        </p>
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-2">
        <Button
          variant="outline"
          className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={logout}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
};
