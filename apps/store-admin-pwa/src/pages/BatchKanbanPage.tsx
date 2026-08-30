import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { DeliveryBatchDTO, DriverDTO, BatchStatus, OrderStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, Button, Modal, Skeleton, formatCurrency } from '@quickcommerce/ui';
import { Layers, Truck, Clock, CheckCircle2, UserCheck, Send, AlertCircle, Eye } from 'lucide-react';

const COLUMNS: { id: BatchStatus; title: string }[] = [
  { id: BatchStatus.READY, title: 'Ready for Batching' },
  { id: BatchStatus.BATCHED, title: 'Batched / Pending Driver' },
  { id: BatchStatus.DRIVER_ASSIGNED, title: 'Driver Assigned' },
  { id: BatchStatus.OUT_FOR_DELIVERY, title: 'Out for Delivery' },
  { id: BatchStatus.COMPLETED, title: 'Completed Batches' },
];

export const BatchKanbanPage: React.FC = () => {
  const { store } = useStoreAdminAuth();

  const [batches, setBatches] = useState<DeliveryBatchDTO[]>([]);
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Assign Driver Modal state
  const [selectedBatchForAssign, setSelectedBatchForAssign] = useState<DeliveryBatchDTO | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Batch Details Modal
  const [inspectBatch, setInspectBatch] = useState<DeliveryBatchDTO | null>(null);

  const loadData = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const [batchesData, driversData] = await Promise.all([
        apiRequest<DeliveryBatchDTO[]>(`/batches?storeId=${store.id}`),
        apiRequest<DriverDTO[]>(`/drivers?storeId=${store.id}`),
      ]);
      setBatches(batchesData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Failed to load batch board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store]);

  const handleOpenAssignModal = (batch: DeliveryBatchDTO) => {
    setSelectedBatchForAssign(batch);
    const firstAvail = drivers.find((d) => d.isAvailable);
    setSelectedDriverId(firstAvail?.id || '');
    setAssignError(null);
  };

  const handleAssignDriver = async () => {
    if (!selectedBatchForAssign || !selectedDriverId) return;
    setIsAssigning(true);
    setAssignError(null);

    try {
      await apiRequest(`/drivers/batches/${selectedBatchForAssign.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          driverId: selectedDriverId,
          expectedVersion: selectedBatchForAssign.version,
        }),
      });

      setSelectedBatchForAssign(null);
      await loadData();
    } catch (err: any) {
      setAssignError(err?.message || 'Failed to assign driver');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDispatchBatch = async (batchId: string) => {
    try {
      await apiRequest(`/batches/${batchId}/dispatch`, { method: 'POST' });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to dispatch batch');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Delivery Batch Board (Kanban)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated order delivery batches grouped by 3-hour windows for {store?.name}.
          </p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadData}>
          Refresh Board
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {COLUMNS.map((col) => {
          const colBatches = batches.filter((b) => b.status === col.id);

          return (
            <div key={col.id} className="flex flex-col rounded-3xl bg-slate-100/80 border border-slate-200/80 p-3 min-h-[500px]">
              {/* Column Title */}
              <div className="flex items-center justify-between pb-3 px-1">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{col.title}</h3>
                <span className="h-5 px-2 rounded-full bg-white border border-slate-200 text-[11px] font-black text-slate-700 flex items-center justify-center shadow-2xs">
                  {colBatches.length}
                </span>
              </div>

              {/* Cards inside column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 font-mono">{batch.batchNumber}</span>
                      <StatusBadge status={batch.status} />
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{batch.deliverySlot?.startTime} – {batch.deliverySlot?.endTime}</span>
                      </div>
                      <p className="font-semibold text-slate-900">
                        {batch.totalOrders} Orders ({batch.completedOrders} Delivered)
                      </p>
                      {batch.driver ? (
                        <div className="flex items-center gap-1.5 pt-1 text-xs text-emerald-800 font-bold">
                          <Truck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{batch.driver.user?.name || 'Assigned Driver'}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-semibold block pt-1">
                          No Driver Assigned
                        </span>
                      )}
                    </div>

                    {/* Column Action CTAs */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                      {!batch.driverId && batch.status !== BatchStatus.COMPLETED && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-bold"
                          leftIcon={<UserCheck className="h-3.5 w-3.5" />}
                          onClick={() => handleOpenAssignModal(batch)}
                        >
                          Assign Driver
                        </Button>
                      )}

                      {batch.driverId && batch.status === BatchStatus.DRIVER_ASSIGNED && (
                        <Button
                          variant="emerald"
                          size="sm"
                          className="w-full text-xs font-bold"
                          leftIcon={<Send className="h-3.5 w-3.5" />}
                          onClick={() => handleDispatchBatch(batch.id)}
                        >
                          Dispatch Batch
                        </Button>
                      )}

                      <button
                        onClick={() => setInspectBatch(batch)}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 text-center py-1 flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3 w-3" /> View {batch.totalOrders} Orders
                      </button>
                    </div>
                  </div>
                ))}

                {colBatches.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    No batches
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Driver Assignment Modal with Overlap & Availability Validation */}
      <Modal
        isOpen={!!selectedBatchForAssign}
        onClose={() => setSelectedBatchForAssign(null)}
        title={`Assign Driver to Batch: ${selectedBatchForAssign?.batchNumber}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSelectedBatchForAssign(null)}>
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              isLoading={isAssigning}
              disabled={isAssigning || !selectedDriverId}
              onClick={handleAssignDriver}
            >
              Confirm Assignment
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Selected delivery slot:{' '}
            <span className="font-bold text-slate-900">
              {selectedBatchForAssign?.deliverySlot?.startTime} – {selectedBatchForAssign?.deliverySlot?.endTime}
            </span>
          </p>

          {assignError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{assignError}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="font-bold text-slate-700 block">Choose Eligible Driver:</label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {drivers.map((d) => {
                const isSelected = selectedDriverId === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{d.user?.name}</span>
                      <span className="text-slate-500 text-[11px]">{d.vehicleType} • {d.vehicleNumber}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        d.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Inspect Batch Orders Modal */}
      <Modal
        isOpen={!!inspectBatch}
        onClose={() => setInspectBatch(null)}
        title={`Batch Details: ${inspectBatch?.batchNumber}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Delivery Window</span>
              <span className="font-bold text-slate-900">{inspectBatch?.deliverySlot?.startTime}–{inspectBatch?.deliverySlot?.endTime}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Assigned Driver</span>
              <span className="font-bold text-slate-900">{inspectBatch?.driver?.user?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">Fulfillment</span>
              <span className="font-bold text-emerald-700">{inspectBatch?.completedOrders}/{inspectBatch?.totalOrders} Delivered</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">Member Orders</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {inspectBatch?.orders?.map((order, idx) => (
                <div key={order.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">#{order.orderNumber} • {order.customer?.name}</span>
                    <span className="text-slate-500 text-[11px]">{order.addressSnapshot?.street}, {order.addressSnapshot?.city}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">{formatCurrency(Number(order.total))}</span>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
