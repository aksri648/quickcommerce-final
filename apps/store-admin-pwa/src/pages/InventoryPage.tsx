import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { InventoryDTO, InventoryMovementType } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Modal, Input, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { Boxes, Plus, Minus, RotateCcw, AlertTriangle, CheckCircle2, History, Search } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { store } = useStoreAdminAuth();

  const [inventory, setInventory] = useState<InventoryDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Adjustment Modal
  const [selectedInv, setSelectedInv] = useState<InventoryDTO | null>(null);
  const [movementType, setMovementType] = useState<InventoryMovementType>(InventoryMovementType.RESTOCK);
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('Daily morning supplier restock');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadInventory = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const data = await apiRequest<InventoryDTO[]>(`/inventory/store/${store.id}`);
      setInventory(data);
    } catch (err) {
      console.error('Failed to load store inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [store]);

  const handleOpenAdjust = (inv: InventoryDTO) => {
    setSelectedInv(inv);
    setQuantity(10);
    setMovementType(InventoryMovementType.RESTOCK);
    setReason('Daily morning supplier restock');
    setErrorMsg(null);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedInv || !store) return;
    if (!reason.trim()) {
      setErrorMsg('Audit compliance requires a reason for every inventory adjustment.');
      return;
    }

    setIsAdjusting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          storeId: store.id,
          productId: selectedInv.productId,
          type: movementType,
          quantity: Number(quantity),
          reason,
          expectedVersion: selectedInv.version,
        }),
      });

      setSelectedInv(null);
      await loadInventory();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to adjust inventory');
    } finally {
      setIsAdjusting(false);
    }
  };

  const filtered = inventory.filter((i) =>
    i.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.product?.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Dark Store Inventory Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Row-level locked stock ledger with strict concurrency controls for {store?.name}
          </p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadInventory}>
          Refresh Inventory
        </Button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          placeholder="Filter by product name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="bg-white rounded-2xl"
        />
      </div>

      {/* Inventory Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product / SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Stock</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Available for Sale</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => {
                const isLowStock = inv.availableQuantity <= inv.lowStockThreshold;
                const isOOS = inv.availableQuantity <= 0;

                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <span className="font-bold block text-slate-900">{inv.product?.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">SKU: {inv.product?.sku} • {inv.product?.unit}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {inv.product?.category?.name || 'Groceries'}
                    </TableCell>
                    <TableCell className="font-black text-slate-900">
                      {inv.quantity}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-amber-600">
                      {inv.reservedQuantity}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-black text-emerald-800">
                        {inv.availableQuantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isOOS ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                          OUT OF STOCK
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          IN STOCK
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-bold"
                        onClick={() => handleOpenAdjust(inv)}
                      >
                        Adjust Stock
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Inventory Adjustment Modal */}
      <Modal
        isOpen={!!selectedInv}
        onClose={() => setSelectedInv(null)}
        title={`Adjust Stock: ${selectedInv?.product?.name}`}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setSelectedInv(null)}>
              Cancel
            </Button>
            <Button
              variant="emerald"
              size="sm"
              isLoading={isAdjusting}
              onClick={handleSaveAdjustment}
            >
              Commit Adjustment
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Available</span>
              <span className="text-lg font-black text-slate-900">{selectedInv?.availableQuantity} units</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Reserved In Orders</span>
              <span className="text-lg font-black text-amber-600">{selectedInv?.reservedQuantity} units</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Adjustment Type</label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as InventoryMovementType)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 text-xs focus:border-emerald-600 focus:outline-none"
              >
                <option value={InventoryMovementType.RESTOCK}>RESTOCK (Add incoming inventory)</option>
                <option value={InventoryMovementType.ADJUSTMENT_INCREASE}>INCREASE (Found inventory discrepancy)</option>
                <option value={InventoryMovementType.ADJUSTMENT_DECREASE}>DECREASE (Damaged / Expired inventory)</option>
                <option value={InventoryMovementType.SET_EXACT}>SET EXACT (Manual physical count)</option>
              </select>
            </div>

            <Input
              label="Quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <Input
              label="Reason for Audit Ledger"
              placeholder="E.g., Batch received from supplier #848"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
