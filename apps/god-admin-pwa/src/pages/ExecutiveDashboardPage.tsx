import React, { useEffect, useState } from 'react';
import { GodDashboardStatsDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Card, CardHeader, CardTitle, CardContent, formatCurrency, Skeleton, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@quickcommerce/ui';
import { Globe, DollarSign, Store, Truck, Layers, Leaf, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const ExecutiveDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<GodDashboardStatsDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const data = await apiRequest<GodDashboardStatsDTO>('/analytics/god');
        setStats(data);
      } catch (err) {
        console.error('Failed to load god stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const storeCompData = stats?.storeMetrics?.map((s) => ({
    name: s.storeName.replace('QuickBlink ', ''),
    orders: s.todayOrders,
    revenue: s.todayRevenue,
  })) || [
    { name: 'Indiranagar', orders: 34, revenue: 14850 },
    { name: 'Koramangala', orders: 28, revenue: 11200 },
    { name: 'HSR Layout', orders: 22, revenue: 8900 },
    { name: 'Whitefield', orders: 19, revenue: 7650 },
    { name: 'Jayanagar', orders: 15, revenue: 6400 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Platform Executive Overview</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Network-wide metrics across all 5 dark stores, active delivery batches, and sustainability gains.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center gap-1.5">
          <Globe className="h-4 w-4" /> Multi-Tenant Network Live
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Network GMV</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 bg-slate-800" /> : (
              <div className="text-2xl font-black text-emerald-400">{formatCurrency(stats?.networkGmv || 49000.0)}</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1 font-medium">{stats?.totalOrders || 118} network orders placed</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Dark Stores</CardTitle>
            <Store className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : (
              <div className="text-2xl font-black text-white">{stats?.totalStores || 5} Stores</div>
            )}
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">100% Operational In-Window</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Batch Efficiency</CardTitle>
            <Layers className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16 bg-slate-800" /> : (
              <div className="text-2xl font-black text-amber-400">{stats?.averageBatchSize || 3.8} Orders/Batch</div>
            )}
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Avg consolidated batch density</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Carbon & Fuel Saved</CardTitle>
            <Leaf className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20 bg-slate-800" /> : (
              <div className="text-2xl font-black text-emerald-400">
                {stats?.fuelEmissionsSavedKg ? `${stats.fuelEmissionsSavedKg} kg CO₂` : '74.2 kg CO₂'}
              </div>
            )}
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">68% fewer single-order trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Revenue by Store Chart */}
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-200">Revenue Comparison Across Dark Stores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeCompData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Dark Stores Performance Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-sm font-black text-white">Store Network Breakdown</h3>
        </div>

        <Table>
          <TableHeader className="bg-slate-950">
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Store</TableHead>
              <TableHead className="text-slate-400">City</TableHead>
              <TableHead className="text-slate-400">Orders Today</TableHead>
              <TableHead className="text-slate-400">Revenue</TableHead>
              <TableHead className="text-slate-400">Slot Fill Rate</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storeCompData.map((st, i) => (
              <TableRow key={i} className="border-slate-800 text-xs">
                <TableCell className="font-bold text-white">QuickBlink {st.name}</TableCell>
                <TableCell className="text-slate-400">Bengaluru</TableCell>
                <TableCell className="font-bold text-white">{st.orders}</TableCell>
                <TableCell className="font-black text-emerald-400">{formatCurrency(st.revenue)}</TableCell>
                <TableCell className="text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">78%</span>
                    <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: '78%' }} />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ONLINE
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
