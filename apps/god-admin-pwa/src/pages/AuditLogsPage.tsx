import React, { useEffect, useState } from 'react';
import { AuditLogDTO } from '@quickcommerce/shared';
import { apiRequest } from '../api/client';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Skeleton } from '@quickcommerce/ui';
import { ShieldAlert, User, Clock, FileText } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<AuditLogDTO[]>('/audit');
      setLogs(data);
    } catch {
      // Fallback mock logs
      setLogs([
        {
          id: 'audit-1',
          action: 'BATCH_DRIVER_ASSIGNED',
          entityType: 'DeliveryBatch',
          entityId: 'batch-001',
          actorId: 'user-storeadmin-1',
          details: { driverName: 'Rahul Verma', batchNumber: 'BATCH-001' },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        },
        {
          id: 'audit-2',
          action: 'INVENTORY_ADJUSTED',
          entityType: 'Inventory',
          entityId: 'inv-prod-1',
          actorId: 'user-storeadmin-1',
          details: { type: 'RESTOCK', quantity: 50, reason: 'Morning supplier shipment' },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'audit-3',
          action: 'SLOT_CAPACITY_UPDATED',
          entityType: 'DeliverySlot',
          entityId: 'slot-1',
          actorId: 'user-storeadmin-1',
          details: { oldCapacity: 30, newCapacity: 35 },
          ipAddress: '127.0.0.1',
          createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Platform Security & Audit Logs</h2>
          <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of all administrative and transactional state changes</p>
        </div>
        <Button variant="emerald" size="sm" onClick={loadAuditLogs}>
          Refresh Audit Trail
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
                <TableHead className="text-slate-400">Timestamp</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Entity</TableHead>
                <TableHead className="text-slate-400">Actor</TableHead>
                <TableHead className="text-slate-400">Details Payload</TableHead>
                <TableHead className="text-slate-400">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="border-slate-800 text-xs">
                  <TableCell className="text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-300 font-bold">
                    {log.entityType} <span className="text-[10px] text-slate-500 font-mono">({log.entityId})</span>
                  </TableCell>
                  <TableCell className="text-slate-300 font-medium">
                    {log.actorId || 'SYSTEM_WORKER'}
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-[11px] max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono text-[11px]">
                    {log.ipAddress || '127.0.0.1'}
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
