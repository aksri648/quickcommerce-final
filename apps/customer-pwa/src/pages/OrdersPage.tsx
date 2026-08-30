import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderDTO, OrderStatus } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { StatusBadge, formatCurrency, Skeleton, Button } from '@quickcommerce/ui';
import { Clock, ChevronRight, Package, ShoppingBag } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const data = await apiRequest<OrderDTO[]>('/orders');
        setOrders(data);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const activeOrders = orders.filter(
    (o) => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.CANCELLED
  );
  const completedOrders = orders.filter(
    (o) => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELLED
  );

  const displayedOrders =
    filter === 'ACTIVE' ? activeOrders : filter === 'COMPLETED' ? completedOrders : orders;

  return (
    <div className="pb-24 max-w-2xl mx-auto px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-900">Your Orders</h2>
        <span className="text-xs text-slate-500 font-semibold">{orders.length} total</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'ALL' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          All ({orders.length})
        </button>
        <button
          onClick={() => setFilter('ACTIVE')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'ACTIVE' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Active ({activeOrders.length})
        </button>
        <button
          onClick={() => setFilter('COMPLETED')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'COMPLETED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          Past ({completedOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-3 pt-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)
        ) : displayedOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200/80 p-8">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No orders found</h4>
            <p className="text-xs text-slate-500">You have no {filter.toLowerCase()} orders.</p>
            <Button variant="emerald" size="sm" onClick={() => navigate('/catalog')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          displayedOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer space-y-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400">Order #{order.orderNumber}</span>
                  <h4 className="text-xs font-bold text-slate-900 mt-0.5">{order.store?.name || 'QuickStore'}</h4>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {/* Items preview */}
              <p className="text-xs text-slate-600 line-clamp-1">
                {order.items?.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
              </p>

              {/* Slot & Amount row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {order.deliveryDate} • {order.deliverySlot?.startTime ? `${order.deliverySlot.startTime} – ${order.deliverySlot.endTime}` : 'Scheduled'}
                </span>
                <div className="flex items-center gap-1 font-black text-slate-900">
                  <span>{formatCurrency(Number(order.total))}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
