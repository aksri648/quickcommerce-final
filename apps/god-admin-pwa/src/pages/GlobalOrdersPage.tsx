import React, { useEffect, useState } from 'react';
import { OrderDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusBadge, Button, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { Globe, Clock, Search, Filter, Download, FileText } from 'lucide-react';

export const GlobalOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadGlobalOrders = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<OrderDTO[]>('/orders');
      setOrders(data);
    } catch (err) {
      console.error('Failed to load global orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalOrders();
  }, []);

  const filtered = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadInvoice = (orderId: string) => {
    window.open(`/api/invoices/order/${orderId}/download`, '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Global Platform Orders & Slot Allocations</h2>
          <p className="text-xs text-slate-400 mt-0.5">Real-time consolidated view of orders placed across all dark stores</p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadGlobalOrders}>
          Refresh Global Feed
        </Button>
      </div>

      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl bg-slate-800" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-950">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Order #</TableHead>
                <TableHead className="text-slate-400">Dark Store</TableHead>
                <TableHead className="text-slate-400">Customer</TableHead>
                <TableHead className="text-slate-400">Slot Window</TableHead>
                <TableHead className="text-slate-400">COD Total</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id} className="border-slate-800 text-xs">
                  <TableCell className="font-mono font-bold text-white">{order.orderNumber}</TableCell>
                  <TableCell className="font-semibold text-slate-300">{order.store?.name || 'Dark Store'}</TableCell>
                  <TableCell className="text-slate-300">{order.customer?.name || order.addressSnapshot?.recipientName}</TableCell>
                  <TableCell className="text-slate-400">
                    {order.deliveryDate} • <span className="text-emerald-400 font-bold">{order.deliverySlot?.startTime}–{order.deliverySlot?.endTime}</span>
                  </TableCell>
                  <TableCell className="font-black text-emerald-400">{formatCurrency(Number(order.total))}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleDownloadInvoice(order.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 transition"
                      title="Download GST Invoice"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
