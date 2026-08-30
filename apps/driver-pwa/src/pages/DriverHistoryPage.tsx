import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDriverAuth } from '../context/DriverAuthContext';
import { DeliveryBatchDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Button, StatusBadge, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { ArrowLeft, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

export const DriverHistoryPage: React.FC = () => {
  const { driver } = useDriverAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<DeliveryBatchDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadHistory() {
      if (!driver) return;
      setLoading(true);
      try {
        const data = await apiRequest<DeliveryBatchDTO[]>(`/batches?driverId=${driver.id}`);
        setBatches(data);
      } catch (err) {
        console.error('Failed to load driver history:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [driver]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>
        <h2 className="text-sm font-black text-white">Delivery History</h2>
      </div>

      <div className="space-y-3 pt-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl bg-slate-900" />)
        ) : batches.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2 text-slate-400">
            <Clock className="h-8 w-8 mx-auto text-slate-600" />
            <p className="text-xs">No delivery batches recorded yet.</p>
          </div>
        ) : (
          batches.map((batch) => (
            <div
              key={batch.id}
              onClick={() => navigate(`/batch/${batch.id}`)}
              className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">{batch.batchNumber}</span>
                <StatusBadge status={batch.status} />
              </div>
              <p className="text-xs text-slate-400">
                Slot: {batch.deliverySlot?.startTime}–{batch.deliverySlot?.endTime} • {batch.completedOrders}/{batch.totalOrders} delivered
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
