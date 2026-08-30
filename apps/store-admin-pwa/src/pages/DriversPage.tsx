import React, { useEffect, useState } from 'react';
import { useStoreAdminAuth } from '../context/StoreAdminAuthContext';
import { DriverDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, StatusBadge, Button, Skeleton } from '@quickcommerce/ui';
import { Truck, Phone, CheckCircle2, ShieldCheck } from 'lucide-react';

export const DriversPage: React.FC = () => {
  const { store } = useStoreAdminAuth();
  const [drivers, setDrivers] = useState<DriverDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDrivers = async () => {
    if (!store) return;
    setLoading(true);
    try {
      const data = await apiRequest<DriverDTO[]>(`/drivers?storeId=${store.id}`);
      setDrivers(data);
    } catch (err) {
      console.error('Failed to load store drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [store]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Delivery Fleet & Drivers</h2>
          <p className="text-xs text-slate-500 mt-0.5">Assigned delivery fleet partners for {store?.name}</p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadDrivers}>
          Refresh Fleet Status
        </Button>
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
                <TableHead>Driver Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vehicle Details</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <span className="font-bold block text-slate-900">{driver.user?.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">Driver ID: {driver.id}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> {driver.user?.phone}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <span className="font-bold block">{driver.vehicleType}</span>
                    <span className="text-slate-400 font-mono">{driver.vehicleNumber}</span>
                  </TableCell>
                  <TableCell>
                    {driver.isAvailable ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        AVAILABLE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                        BUSY ON BATCH
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={driver.status} />
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
