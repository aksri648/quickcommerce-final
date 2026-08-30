import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { DeliverySlotDTO, SlotStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, StatusBadge, Button, Modal, Input, Skeleton } from '@quickcommerce/ui';
import { Clock, Users, Layers, AlertCircle, Edit, CheckCircle2 } from 'lucide-react';

export const SlotBoardPage: React.FC = () => {
  const { store } = useStoreAdminAuth();

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [slots, setSlots] = useState<DeliverySlotDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit Capacity Modal state
  const [editingSlot, setEditingSlot] = useState<DeliverySlotDTO | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(30);
  const [newCutoff, setNewCutoff] = useState<number>(30);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadSlots = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const data = await apiRequest<DeliverySlotDTO[]>(`/slots?storeId=${store.id}&date=${selectedDate}`);
      setSlots(data);
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [store, selectedDate]);

  const handleOpenEdit = (slot: DeliverySlotDTO) => {
    setEditingSlot(slot);
    setNewCapacity(slot.capacity);
    setNewCutoff(slot.bookingCutoffMinutes);
    setModalError(null);
  };

  const handleSaveSlotConfig = async () => {
    if (!editingSlot) return;

    if (newCapacity < editingSlot.bookedCount) {
      setModalError(`Cannot reduce capacity to ${newCapacity}. There are already ${editingSlot.bookedCount} orders booked in this slot.`);
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      await apiRequest(`/slots/${editingSlot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          capacity: Number(newCapacity),
          bookingCutoffMinutes: Number(newCutoff),
          expectedVersion: editingSlot.version,
        }),
      });

      setEditingSlot(null);
      await loadSlots();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to update slot configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Delivery Slot Board</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor and manage 3-hour delivery window capacities, booking cutoffs, and fulfillment loads.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === todayStr ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today ({todayStr})
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedDate === tomorrowStr ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tomorrow ({tomorrowStr})
          </button>
        </div>
      </div>

      {/* 4 Operational Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)
        ) : (
          slots.map((slot) => {
            const fillPercentage = Math.min(100, Math.round((slot.bookedCount / Math.max(1, slot.capacity)) * 100));

            return (
              <Card key={slot.id} className="relative overflow-hidden flex flex-col justify-between">
                <div>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-black text-slate-900">
                          {slot.startTime} – {slot.endTime}
                        </CardTitle>
                        <span className="text-[11px] text-slate-500 font-medium">Cutoff: {slot.bookingCutoffMinutes} min prior</span>
                      </div>
                    </div>
                    <StatusBadge status={slot.status} />
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Capacity Meter */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">Capacity Booked</span>
                        <span className="text-slate-900 font-black">
                          {slot.bookedCount} / {slot.capacity} orders
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            fillPercentage >= 90
                              ? 'bg-rose-500'
                              : fillPercentage >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block">
                        {slot.availableCapacity} slots available for customer booking
                      </span>
                    </div>

                    {/* Operational Summary */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Fill Rate</span>
                        <span className="text-base font-black text-slate-900">{fillPercentage}%</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                        <span className="text-xs font-bold text-slate-700 capitalize">{slot.status.toLowerCase()}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Edit Button */}
                <div className="p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    leftIcon={<Edit className="h-3.5 w-3.5" />}
                    onClick={() => handleOpenEdit(slot)}
                  >
                    Adjust Capacity
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Capacity Modal */}
      <Modal
        isOpen={!!editingSlot}
        onClose={() => setEditingSlot(null)}
        title={`Adjust Slot Capacity: ${editingSlot?.startTime} – ${editingSlot?.endTime}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditingSlot(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSaveSlotConfig}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Current bookings: <span className="font-bold text-slate-900">{editingSlot?.bookedCount} orders</span>. You cannot reduce capacity below existing bookings.
          </p>

          {modalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Maximum Slot Capacity (Orders)"
              type="number"
              min={editingSlot?.bookedCount || 1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
            />

            <Input
              label="Booking Cutoff (Minutes before slot start)"
              type="number"
              min={0}
              value={newCutoff}
              onChange={(e) => setNewCutoff(Number(e.target.value))}
              helperText="E.g., 30 mins means orders stop being accepted 30 mins prior to slot start."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
