import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverAuth } from '../context/DriverAuthContext';
import { Button } from '@quickcommerce/ui';
import { Truck, ArrowRight, ShieldCheck } from 'lucide-react';

export const DriverLoginPage: React.FC = () => {
  const { loginAsDriver, isLoading } = useDriverAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    await loginAsDriver();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-2xl text-center">
        <div className="h-16 w-16 mx-auto rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Truck className="h-8 w-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-white">Driver Partner App</h2>
          <p className="text-xs text-slate-400">QuickBlink Scheduled Delivery Partner Console</p>
        </div>

        <Button
          size="lg"
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20"
          isLoading={isLoading}
          rightIcon={<ArrowRight className="h-5 w-5" />}
          onClick={handleLogin}
        >
          Sign In as Partner
        </Button>

        <p className="text-[11px] text-slate-500">
          Signed in with vehicle Ather 450X EV (KA 03 EX 4421)
        </p>
      </div>
    </div>
  );
};
