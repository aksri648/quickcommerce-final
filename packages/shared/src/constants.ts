import { OrderStatus } from './enums';

export const DEFAULT_DELIVERY_SLOTS = [
  { startTime: '09:00', endTime: '12:00', label: '09:00 AM – 12:00 PM', capacity: 30, cutoffMinutes: 30 },
  { startTime: '12:00', endTime: '15:00', label: '12:00 PM – 03:00 PM', capacity: 30, cutoffMinutes: 30 },
  { startTime: '15:00', endTime: '18:00', label: '03:00 PM – 06:00 PM', capacity: 30, cutoffMinutes: 30 },
  { startTime: '18:00', endTime: '21:00', label: '06:00 PM – 09:00 PM', capacity: 30, cutoffMinutes: 30 },
] as const;

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const TAX_RATE_PERCENTAGE = 5; // 5% GST standard grocery
export const BASE_DELIVERY_FEE = 29; // Rs. 29
export const FREE_DELIVERY_THRESHOLD = 299; // Free delivery over Rs. 299

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PLACED]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_DISPATCH, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_DISPATCH]: [OrderStatus.ASSIGNED_TO_BATCH, OrderStatus.CANCELLED],
  [OrderStatus.ASSIGNED_TO_BATCH]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.READY_FOR_DISPATCH, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

export const DEMO_USERS = {
  CUSTOMER: { email: 'customer@quickcommerce.dev', name: 'Aarav Sharma', role: 'CUSTOMER' },
  DRIVER: { email: 'driver@quickcommerce.dev', name: 'Rahul Verma', role: 'DRIVER' },
  STORE_ADMIN: { email: 'storeadmin@quickcommerce.dev', name: 'Priya Patel', role: 'STORE_ADMIN' },
  STORE_STAFF: { email: 'staff@quickcommerce.dev', name: 'Vikram Singh', role: 'STORE_STAFF' },
  SUPER_ADMIN: { email: 'godadmin@quickcommerce.dev', name: 'Super Admin', role: 'SUPER_ADMIN' },
};
