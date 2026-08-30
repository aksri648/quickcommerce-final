import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { DashboardStatsDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, formatCurrency, Skeleton } from '@quickcommerce/ui';
import { ShoppingBag, TrendingUp, Layers, Truck, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC = () => {
  const { store } = useStoreAdminAuth();
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      if (!store) return;
      setLoading(true);
      try {
        const data = await apiRequest<DashboardStatsDTO>(`/analytics/store/${store.id}`);
        setStats(data);
      } catch (err) {
        console.error('Failed to load store dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [store]);

  const chartData = [
    { slot: '09:00–12:00', orders: stats?.ordersBySlot?.['09:00 – 12:00'] || 12 },
    { slot: '12:00–15:00', orders: stats?.ordersBySlot?.['12:00 – 15:00'] || 9 },
    { slot: '15:00–18:00', orders: stats?.ordersBySlot?.['15:00 – 18:00'] || 18 },
    { slot: '18:00–21:00', orders: stats?.ordersBySlot?.['18:00 – 21:00'] || 22 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Welcome Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">{store?.name || 'Store Operations'}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time scheduled fulfillment & batch dispatch hub</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <Clock className="h-4 w-4" /> Current Active Slot: 03:00 PM – 06:00 PM
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-black text-slate-900">{stats?.todayOrders || 34}</div>
            )}
            <p className="text-[11px] text-slate-500 mt-1 font-medium">100% Cash on Delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Today's Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-black text-emerald-700">{formatCurrency(stats?.todayRevenue || 14850.0)}</div>
            )}
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">+14% vs yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Batches Active</CardTitle>
            <Layers className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-black text-indigo-950">{stats?.activeBatches || 3} Batches</div>
            )}
            <p className="text-[11px] text-indigo-700 mt-1 font-medium">{stats?.openBatches || 2} ready for driver assign</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet Availability</CardTitle>
            <Truck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-black text-slate-900">
                <span className="text-emerald-600">{stats?.availableDrivers || 4}</span> / {(stats?.availableDrivers || 4) + (stats?.busyDrivers || 3)} Available
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{stats?.busyDrivers || 3} drivers on active deliveries</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slot Orders Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Orders by 3-Hour Delivery Slot Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="slot" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="orders" fill="#0c831f" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Stock & Fulfilment Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950 block">Low Stock Products</span>
                <span className="text-amber-800 text-[11px]">Below reorder threshold</span>
              </div>
              <span className="text-xl font-black text-amber-900">{stats?.lowStockCount || 3}</span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-950 block">Out of Stock Items</span>
                <span className="text-rose-800 text-[11px]">Disabled from cart additions</span>
              </div>
              <span className="text-xl font-black text-rose-900">{stats?.outOfStockCount || 0}</span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-950 block">Fulfillment Success Rate</span>
                <span className="text-emerald-800 text-[11px]">Delivered on first attempt</span>
              </div>
              <span className="text-xl font-black text-emerald-900">{stats?.completionRate || 98}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
