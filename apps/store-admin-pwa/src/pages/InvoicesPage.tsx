import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { InvoiceDTO, OrderDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, formatCurrency, Skeleton, Modal } from '@quickcommerce/ui';
import { FileText, Download, Printer, ExternalLink } from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { store } = useStoreAdminAuth();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      if (!store) return;
      setLoading(true);
      try {
        const data = await apiRequest<OrderDTO[]>(`/orders?storeId=${store.id}`);
        setOrders(data);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [store]);

  const handleViewInvoice = async (orderId: string) => {
    try {
      const inv = await apiRequest<any>(`/invoices/order/${orderId}`);
      setSelectedInvoice(inv);
    } catch (err: any) {
      alert(err?.message || 'Failed to fetch invoice');
    }
  };

  const handleDownloadInvoice = (orderId: string) => {
    window.open(`/api/invoices/order/${orderId}/download`, '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Tax Invoices & Receipts</h2>
          <p className="text-xs text-slate-500 mt-0.5">GST-compliant invoice records for fulfilled orders</p>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Taxable</TableHead>
                <TableHead>GST (5%)</TableHead>
                <TableHead>Total (COD)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-bold text-slate-900">{order.orderNumber}</TableCell>
                  <TableCell className="text-xs text-slate-700">{order.customer?.name || order.addressSnapshot?.recipientName}</TableCell>
                  <TableCell className="text-xs text-slate-500">{order.deliveryDate}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{formatCurrency(Number(order.subtotal))}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{formatCurrency(Number(order.tax))}</TableCell>
                  <TableCell className="font-black text-slate-900">{formatCurrency(Number(order.total))}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs font-bold"
                        leftIcon={<FileText className="h-3.5 w-3.5" />}
                        onClick={() => handleViewInvoice(order.id)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
                        leftIcon={<Download className="h-3.5 w-3.5" />}
                        onClick={() => handleDownloadInvoice(order.id)}
                        title="Download / Print PDF"
                      >
                        PDF
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Tax Invoice: ${selectedInvoice?.invoiceNumber}`}
        maxWidth="lg"
      >
        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 text-xs">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">QuickBlink Commerce Pvt Ltd</h3>
              <p className="text-slate-500">GSTIN: 29AAAAA0000A1Z5</p>
              <p className="text-slate-500">{store?.name}, {store?.city}</p>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-900 block">{selectedInvoice?.invoiceNumber}</span>
              <span className="text-slate-400">{new Date(selectedInvoice?.createdAt || '').toLocaleDateString()}</span>
            </div>
          </div>

          <div className="space-y-1.5 py-2">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <span className="font-bold">{formatCurrency(Number(selectedInvoice?.order?.subtotal || selectedInvoice?.amount || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (5% GST):</span>
              <span className="font-bold">{formatCurrency(Number(selectedInvoice?.taxAmount || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Partner Fee:</span>
              <span className="font-bold">{Number(selectedInvoice?.order?.deliveryFee || 0) === 0 ? 'FREE' : formatCurrency(Number(selectedInvoice?.order?.deliveryFee || 0))}</span>
            </div>
            <div className="pt-2 border-t flex justify-between font-black text-sm text-slate-900">
              <span>Total Paid (Cash):</span>
              <span className="text-emerald-800">{formatCurrency(Number(selectedInvoice?.amount || 0))}</span>
            </div>
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => handleDownloadInvoice(selectedInvoice.orderId)}
            >
              Print / Save PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
