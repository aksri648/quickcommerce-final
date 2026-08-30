import React from 'react';
import { Badge } from './badge';
import { OrderStatus, BatchStatus, SlotStatus, DriverStatus } from '@quickcommerce/shared';

export interface StatusBadgeProps {
  status: OrderStatus | BatchStatus | SlotStatus | DriverStatus | string;
  type?: 'order' | 'batch' | 'slot' | 'driver' | 'generic';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  let label = String(status).replace(/_/g, ' ');
  let variant: 'default' | 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'outline' = 'default';

  switch (status) {
    // Order Statuses
    case OrderStatus.PLACED:
      variant = 'secondary';
      label = 'Placed';
      break;
    case OrderStatus.ACCEPTED:
      variant = 'indigo';
      label = 'Accepted';
      break;
    case OrderStatus.PREPARING:
      variant = 'amber';
      label = 'Preparing';
      break;
    case OrderStatus.READY_FOR_DISPATCH:
      variant = 'primary';
      label = 'Ready for Dispatch';
      break;
    case OrderStatus.ASSIGNED_TO_BATCH:
      variant = 'indigo';
      label = 'Batched';
      break;
    case OrderStatus.OUT_FOR_DELIVERY:
      variant = 'amber';
      label = 'Out for Delivery';
      break;
    case OrderStatus.DELIVERED:
      variant = 'emerald';
      label = 'Delivered';
      break;
    case OrderStatus.CANCELLED:
      variant = 'rose';
      label = 'Cancelled';
      break;

    // Batch Statuses
    case BatchStatus.READY:
      variant = 'secondary';
      label = 'Ready';
      break;
    case BatchStatus.BATCHED:
      variant = 'primary';
      label = 'Batched';
      break;
    case BatchStatus.DRIVER_ASSIGNED:
      variant = 'indigo';
      label = 'Driver Assigned';
      break;
    case BatchStatus.COMPLETED:
      variant = 'emerald';
      label = 'Completed';
      break;

    // Slot Statuses
    case SlotStatus.UPCOMING:
      variant = 'secondary';
      label = 'Upcoming';
      break;
    case SlotStatus.OPEN:
      variant = 'emerald';
      label = 'Open';
      break;
    case SlotStatus.FULL:
      variant = 'rose';
      label = 'Fully Booked';
      break;
    case SlotStatus.CLOSED:
      variant = 'rose';
      label = 'Closed';
      break;
    case SlotStatus.IN_PROGRESS:
      variant = 'amber';
      label = 'In Progress';
      break;

    // Driver Statuses
    case DriverStatus.AVAILABLE:
      variant = 'emerald';
      label = 'Available';
      break;
    case DriverStatus.BUSY:
      variant = 'amber';
      label = 'On Delivery';
      break;
    case DriverStatus.OFFLINE:
      variant = 'secondary';
      label = 'Offline';
      break;
    case DriverStatus.INACTIVE:
      variant = 'rose';
      label = 'Inactive';
      break;

    default:
      variant = 'default';
  }

  return (
    <Badge variant={variant} className={className}>
      <span className="capitalize">{label}</span>
    </Badge>
  );
};
