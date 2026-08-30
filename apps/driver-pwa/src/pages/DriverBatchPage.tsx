import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DeliveryBatchDTO, OrderDTO, OrderStatus, BatchStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Button, StatusBadge, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { ArrowLeft, MapPin, Phone, ChevronRight, CheckCircle2, PackageCheck, AlertTriangle } from 'lucide-react';

export const DriverBatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<DeliveryBatchDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadBatchDetails() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiRequest<DeliveryBatchDTO>(`/batches/${id}`);
        setBatch(data);
      } catch (err) {
        console.error('Failed to load batch stops:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBatchDetails();
  }, [id]);

  if (loading || !batch) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Skeleton className="h-20 w-full rounded-2xl bg-slate-900" />
        <Skeleton className="h-64 w-full rounded-2xl bg-slate-900" />
      </div>
    );
  }

  const isCompleted = batch.status === BatchStatus.COMPLETED;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>
        <span className="text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-xl">
          {batch.batchNumber}
        </span>
      </div>

      {/* Header Info */}
      <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white">Delivery Stops Sequence</h2>
          <StatusBadge status={batch.status} />
        </div>
        <p className="text-xs text-slate-400">
          Slot: {batch.deliverySlot?.startTime ? `${batch.deliverySlot.startTime} – ${batch.deliverySlot.endTime}` : '03:00 PM – 06:00 PM'} • {batch.store?.name}
        </p>
      </div>

      {/* Stop by Stop Orders */}
      <div className="space-y-3">
        {batch.orders?.map((order, idx) => {
          const isDone = order.status === OrderStatus.DELIVERED;
          return (
            <div
              key={order.id}
              onClick={() => navigate(`/delivery/${order.id}`)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2.5 ${
                isDone
                  ? 'bg-slate-900/40 border-slate-850 opacity-60'
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                      isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-400 text-slate-950'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {order.customer?.name || order.addressSnapshot?.recipientName || 'Customer'}
                  </span>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Address */}
              <div className="flex items-start gap-2 text-xs text-slate-400">
                <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="line-clamp-2">
                  {order.addressSnapshot?.apartment ? `${order.addressSnapshot.apartment}, ` : ''}
                  {order.addressSnapshot?.street}, {order.addressSnapshot?.city}
                </p>
              </div>

              {/* Footer row */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="font-extrabold text-amber-400">
                  Collect {formatCurrency(Number(order.total))} (COD)
                </span>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <span>{isDone ? 'Delivered' : 'Tap to Deliver'}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
