import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@quickcommerce/shared';
import { Button, Input } from '@quickcommerce/ui';
import { Zap, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAsDemo, isLoading } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState<string>('9988776655');

  const handleLogin = async () => {
    await loginAsDemo(UserRole.CUSTOMER);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200/80 p-6 space-y-6 shadow-sm">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 mx-auto rounded-2xl bg-emerald-600 flex items-center justify-center text-amber-300 font-black shadow-xs">
            <Zap className="h-7 w-7 fill-amber-400 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-slate-900">QuickBlink Groceries</h2>
          <p className="text-xs text-slate-500">Scheduled 3-Hour Rapid Delivery Platform</p>
        </div>

        <div className="space-y-3">
          <Input
            label="Mobile Number"
            type="tel"
            placeholder="Enter 10-digit number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="h-4 w-4" />}
          />

          <Button
            variant="emerald"
            size="lg"
            className="w-full shadow-md"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={handleLogin}
          >
            Continue as Customer
          </Button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Demo Authentication enabled. Tap Continue to login instantly.</span>
        </div>
      </div>
    </div>
  );
};
