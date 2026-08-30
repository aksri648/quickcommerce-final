import React, { useEffect, useState } from 'react';
import { StoreDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Modal, Input, Skeleton } from '@quickcommerce/ui';
import { Store, MapPin, Clock, Edit, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';

export const StoresManagerPage: React.FC = () => {
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Edit Store Modal
  const [editingStore, setEditingStore] = useState<StoreDTO | null>(null);
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<StoreDTO[]>('/stores');
      setStores(data);
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleOpenEdit = (store: StoreDTO) => {
    setEditingStore(store);
    setName(store.name);
    setAddress(store.address);
    setCity(store.city);
    setPincode(store.pincode);
    setIsActive(store.isActive);
    setErrorMsg(null);
  };

  const handleSaveStore = async () => {
    if (!editingStore) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      await apiRequest(`/stores/${editingStore.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          address,
          city,
          pincode,
          isActive,
          expectedVersion: editingStore.version,
        }),
      });

      setEditingStore(null);
      await loadStores();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update store');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Dark Stores Network Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure locations, operational hours, slot schedules, and status for all network dark stores.
          </p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadStores}>
          Refresh Stores
        </Button>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Store Name</TableHead>
                <TableHead className="text-slate-400">Code</TableHead>
                <TableHead className="text-slate-400">Location / Pincode</TableHead>
                <TableHead className="text-slate-400">Operating Hours</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id} className="border-slate-800 text-xs">
                  <TableCell className="font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span>{store.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-indigo-300 font-bold">{store.code}</TableCell>
                  <TableCell className="text-slate-400">
                    {store.address}, {store.city} - {store.pincode}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {store.openingTime} – {store.closingTime}
                  </TableCell>
                  <TableCell>
                    {store.isActive ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        INACTIVE
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-slate-800 border-slate-700 text-slate-200 hover:text-white"
                      leftIcon={<Edit className="h-3.5 w-3.5" />}
                      onClick={() => handleOpenEdit(store)}
                    >
                      Edit Store
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit Store Modal */}
      <Modal
        isOpen={!!editingStore}
        onClose={() => setEditingStore(null)}
        title={`Edit Store: ${editingStore?.name}`}
        className="bg-slate-900 text-white border-slate-800"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-800 border-slate-700 text-slate-300"
              onClick={() => setEditingStore(null)}
            >
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              isLoading={isSaving}
              onClick={handleSaveStore}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Store Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950 text-white border-slate-700"
            />

            <Input
              label="Street Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-slate-950 text-white border-slate-700"
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-slate-950 text-white border-slate-700"
              />
              <Input
                label="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="bg-slate-950 text-white border-slate-700"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="activeToggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <label htmlFor="activeToggle" className="font-bold text-slate-300">
                Store is active & accepting customer orders
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
