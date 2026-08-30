import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverAuth } from '../context/DriverAuthContext';
import { DeliveryBatchDTO, OrderDTO, OrderStatus, BatchStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Button, StatusBadge, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { Truck, CheckCircle2, Clock, MapPin, ArrowRight, ShieldCheck, Power, Zap, AlertCircle } from 'lucide-react';

export const DriverDashboardPage: React.FC = () => {
  const { driver, updateStatus, logout } = useDriverAuth();
  const navigate = useNavigate();

  const [activeBatch, setActiveBatch] = useState<DeliveryBatchDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadBatch() {
      if (!driver) return;
      setLoading(true);
      try {
        const batches = await apiRequest<DeliveryBatchDTO[]>(
          `/batches?driverId=${driver.id}&status=OUT_FOR_DELIVERY`
        );
        if (batches.length > 0) {
          setActiveBatch(batches[0]);
        } else {
          // Check DRIVER_ASSIGNED or READY
          const assigned = await apiRequest<DeliveryBatchDTO[]>(
            `/batches?driverId=${driver.id}`
          );
          setActiveBatch(assigned[0] || null);
        }
      } catch (err) {
        console.error('Failed to load driver batch:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBatch();
  }, [driver]);

  const isOnline = driver?.status !== 'OFFLINE';
  const isBusy = driver?.status === 'BUSY';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto space-y-4">
      {/* Top Driver Bar */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-lg">
            {driver?.user?.name?.charAt(0) || 'D'}
          </div>
          <div>
            <h2 className="text-base font-black text-white">{driver?.user?.name || 'Rahul Verma'}</h2>
            <p className="text-xs text-slate-400 font-medium">
              {driver?.store?.name || 'QuickBlink Indiranagar'} • {driver?.vehicleType}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle Button */}
        <button
          onClick={() => updateStatus(isOnline ? 'OFFLINE' : 'AVAILABLE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
            isOnline
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
              : 'bg-slate-800 border border-slate-700 text-slate-400'
          }`}
        >
          <Power className="h-3.5 w-3.5" />
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </button>
      </header>

      {/* Today's Operational KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned</span>
          <p className="text-xl font-black text-white mt-0.5">{activeBatch?.totalOrders || 4}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
          <p className="text-xl font-black text-emerald-400 mt-0.5">{activeBatch?.completedOrders || 2}</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Cash Today</span>
          <p className="text-base font-black text-amber-400 mt-1">₹945.0</p>
        </div>
      </div>

      {/* ACTIVE BATCH CARD */}
      {loading ? (
        <Skeleton className="h-64 rounded-3xl bg-slate-900" />
      ) : activeBatch ? (
        <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">
                Active Batch: {activeBatch.batchNumber}
              </h3>
            </div>
            <StatusBadge status={activeBatch.status} />
          </div>

          {/* Delivery Slot Window */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-400" /> Scheduled Slot
            </span>
            <span className="font-black text-white">
              {activeBatch.deliverySlot?.startTime ? `${activeBatch.deliverySlot.startTime} – ${activeBatch.deliverySlot.endTime}` : '03:00 PM – 06:00 PM'}
            </span>
          </div>

          {/* Batch Progress Meter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span>Delivery Stops</span>
              <span>{activeBatch.completedOrders} of {activeBatch.totalOrders} Delivered</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${activeBatch.totalOrders > 0 ? (activeBatch.completedOrders / activeBatch.totalOrders) * 100 : 50}%`,
                }}
              />
            </div>
          </div>

          {/* Action CTA */}
          <Button
            size="lg"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-base shadow-lg shadow-emerald-500/20"
            rightIcon={<ArrowRight className="h-5 w-5" />}
            onClick={() => navigate(`/batch/${activeBatch.id}`)}
          >
            Open Delivery Stops ({activeBatch.totalOrders - activeBatch.completedOrders} left)
          </Button>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Truck className="h-10 w-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">No Active Batches</h4>
          <p className="text-xs text-slate-400">
            You are online and available. When Store Admin consolidates orders into a batch and assigns you, it will appear here instantly.
          </p>
        </div>
      )}

      {/* Safety & Protocol Banner */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5 text-slate-400">
        <div className="flex items-center gap-1.5 font-bold text-slate-200">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Delivery Protocol
        </div>
        <p className="text-[11px] leading-relaxed">
          1. Hand over package to customer.<br />
          2. Collect cash as shown on screen.<br />
          3. Ask customer for their 6-digit Delivery OTP.<br />
          4. Enter OTP to mark delivery completed.
        </p>
      </div>
    </div>
  );
};
