import React from 'react';
import { cn } from '../lib/utils';
import { DeliverySlotDTO, SlotStatus } from '@quickcommerce/shared';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SlotCardProps {
  slot: DeliverySlotDTO;
  isSelected?: boolean;
  onSelect?: (slot: DeliverySlotDTO) => void;
  className?: string;
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  isSelected = false,
  onSelect,
  className,
}) => {
  const isAvailable = slot.status === SlotStatus.OPEN && slot.availableCapacity > 0;
  const isFull = slot.status === SlotStatus.FULL || slot.availableCapacity <= 0;
  const isFewLeft = isAvailable && slot.availableCapacity <= 5;

  let availabilityText = 'Available';
  let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (isFull) {
    availabilityText = 'Fully booked';
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (isFewLeft) {
    availabilityText = `Only ${slot.availableCapacity} left`;
    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (slot.status === SlotStatus.CLOSED) {
    availabilityText = 'Booking closed';
    badgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
  }

  const timeLabel = slot.formattedTimeWindow || `${slot.startTime} – ${slot.endTime}`;

  return (
    <div
      onClick={() => {
        if (isAvailable) onSelect?.(slot);
      }}
      className={cn(
        'relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200',
        isAvailable
          ? isSelected
            ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/30 shadow-xs cursor-pointer'
            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50/50 cursor-pointer shadow-xs'
          : 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
          )}
        >
          <Clock className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">{timeLabel}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                badgeStyle
              )}
            >
              {availabilityText}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        {isSelected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
        ) : isAvailable ? (
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-emerald-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-slate-400" />
        )}
      </div>
    </div>
  );
};
