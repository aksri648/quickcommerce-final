import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { OrderDTO, OrderStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusBadge, Button, formatCurrency, Modal, Skeleton } from '@quickcommerce/ui';
import { Eye, CheckCircle2, Clock, MapPin, XCircle, Search } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { store } = useStoreAdminAuth();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<OrderDTO | null>(null);

  const loadOrders = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const data = await apiRequest<OrderDTO[]>(`/orders?storeId=${store.id}`);
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [store]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      await apiRequest(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update order status');
    }
  };

  const filteredOrders = statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Store Orders Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Accept, prepare, and verify delivery fulfillment for {store?.name}</p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadOrders}>
          Refresh Orders
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP, OrderStatus.DELIVERED].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              statusFilter === st
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Orders Table */}
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
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Slot Window</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-bold text-slate-900">{order.orderNumber}</TableCell>
                  <TableCell>
                    <span className="font-bold block text-slate-900">{order.customer?.name || order.addressSnapshot?.recipientName}</span>
                    <span className="text-slate-400 text-[11px]">{order.addressSnapshot?.phone}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {order.deliveryDate}
                    <span className="block text-[11px] font-bold text-emerald-700">
                      {order.deliverySlot?.startTime} – {order.deliverySlot?.endTime}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {order.items.length} items
                  </TableCell>
                  <TableCell className="font-black text-slate-900">
                    {formatCurrency(Number(order.total))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-bold"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>

                      {order.status === OrderStatus.PLACED && (
                        <Button
                          variant="emerald"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold"
                          onClick={() => handleUpdateStatus(order.id, OrderStatus.CONFIRMED)}
                        >
                          Accept
                        </Button>
                      )}
                      {order.status === OrderStatus.CONFIRMED && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                          onClick={() => handleUpdateStatus(order.id, OrderStatus.PREPARING)}
                        >
                          Prepare
                        </Button>
                      )}
                      {order.status === OrderStatus.PREPARING && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleUpdateStatus(order.id, OrderStatus.READY_FOR_PICKUP)}
                        >
                          Ready
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Order Details: #${selectedOrder?.orderNumber}`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
              <span className="font-bold text-slate-900 text-sm">{selectedOrder?.customer?.name || selectedOrder?.addressSnapshot?.recipientName}</span>
              <p className="text-slate-500 text-[11px]">{selectedOrder?.addressSnapshot?.street}, {selectedOrder?.addressSnapshot?.city}</p>
            </div>
            <StatusBadge status={selectedOrder?.status || OrderStatus.PLACED} />
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase text-[11px]">Items Checklist</h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-white">
              {selectedOrder?.items.map((item) => (
                <div key={item.id} className="py-2 px-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">{item.productNameSnapshot}</span>
                    <span className="text-[11px] text-slate-400">{item.unitSnapshot}</span>
                  </div>
                  <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    Qty: {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex justify-between items-center">
            <span className="font-bold text-amber-950">Cash to Collect (COD):</span>
            <span className="text-base font-black text-amber-950">{formatCurrency(Number(selectedOrder?.total || 0))}</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};
