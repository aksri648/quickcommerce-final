import React from 'react';
import { cn, formatDateTime } from '../lib/utils';
import { OrderStatus, OrderStatusHistoryDTO } from '@quickcommerce/shared';
import { Check, Clock, PackageCheck, Truck, CheckCircle, XCircle } from 'lucide-react';

export interface OrderTimelineProps {
  currentStatus: OrderStatus;
  history?: OrderStatusHistoryDTO[];
  className?: string;
}

const STEPS = [
  { status: OrderStatus.PLACED, label: 'Order Placed', desc: 'Order received & confirmed' },
  { status: OrderStatus.ACCEPTED, label: 'Accepted', desc: 'Store accepted order' },
  { status: OrderStatus.PREPARING, label: 'Preparing', desc: 'Items being packed' },
  { status: OrderStatus.READY_FOR_DISPATCH, label: 'Ready', desc: 'Packed & ready for pickup' },
  { status: OrderStatus.ASSIGNED_TO_BATCH, label: 'Batched', desc: 'Consolidated into delivery batch' },
  { status: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for Delivery', desc: 'Driver is on the way' },
  { status: OrderStatus.DELIVERED, label: 'Delivered', desc: 'Successfully delivered via OTP' },
];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ currentStatus, history = [], className }) => {
  if (currentStatus === OrderStatus.CANCELLED) {
    return (
      <div className={cn('p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3', className)}>
        <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-rose-900">Order Cancelled</h4>
          <p className="text-xs text-rose-700">This order has been cancelled and stock/slot released.</p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      {/* Connecting vertical line */}
      <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-slate-200" />

      {STEPS.map((step, idx) => {
        const isCompleted = currentIndex >= idx;
        const isCurrent = currentIndex === idx;
        const matchingHistory = history.find((h) => h.toStatus === step.status);

        return (
          <div key={step.status} className="relative flex items-start gap-4">
            {/* Step icon circle */}
            <div
              className={cn(
                'absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors z-10',
                isCompleted
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-400'
              )}
            >
              {isCompleted ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h5
                  className={cn(
                    'text-xs font-bold leading-tight',
                    isCurrent ? 'text-emerald-700' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                  )}
                >
                  {step.label}
                </h5>
                {matchingHistory && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDateTime(matchingHistory.createdAt)}
                  </span>
                )}
              </div>
              <p className={cn('text-[11px] mt-0.5', isCompleted ? 'text-slate-500' : 'text-slate-400')}>
                {step.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
