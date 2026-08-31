import {
  UserRole,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  BatchStatus,
  SlotStatus,
  DriverStatus,
  InventoryMovementType,
  AuditAction,
  NotificationChannel
} from './enums';

export interface UserDTO {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDTO {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  isActive: boolean;
  openingTime: string;
  closingTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
}

export interface ProductDTO {
  id: string;
  categoryId: string;
  category?: CategoryDTO;
  name: string;
  slug: string;
  description?: string | null;
  brand: string;
  unit: string;
  mrp: number;
  basePrice: number;
  imageUrl?: string | null;
  isActive: boolean;
  version: number;
  // Store-specific projection
  storePrice?: number;
  isAvailableInStore?: boolean;
  availableQuantity?: number;
  lowStockThreshold?: number;
}

export interface InventoryDTO {
  id: string;
  storeId: string;
  store?: StoreDTO;
  productId: string;
  product?: ProductDTO;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  version: number;
  updatedAt: string;
}

export interface InventoryMovementDTO {
  id: string;
  inventoryId: string;
  type: InventoryMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  beforeQuantity: number;
  afterQuantity: number;
  actorId: string;
  reason?: string | null;
  createdAt: string;
}

export interface AddressDTO {
  id: string;
  customerId: string;
  type: string;
  recipientName: string;
  phone: string;
  street: string;
  apartment?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverySlotDTO {
  id: string;
  storeId: string;
  date: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "12:00"
  formattedTimeWindow?: string; // "09:00 AM – 12:00 PM"
  bookingCutoffMinutes: number;
  capacity: number;
  bookedCount: number;
  availableCapacity: number;
  status: SlotStatus;
  availabilityLabel?: 'Available' | 'Few slots left' | 'Fully booked' | 'Closed';
  isActive: boolean;
  version: number;
}

export interface CartItemDTO {
  id: string;
  productId: string;
  product: ProductDTO;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartDTO {
  id: string;
  customerId: string;
  storeId: string;
  store?: StoreDTO;
  items: CartItemDTO[];
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  grandTotal: number;
}

export interface OrderItemDTO {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitSnapshot: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  tax: number;
  total: number;
  imageUrl?: string | null;
}

export interface OrderStatusHistoryDTO {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  reason?: string | null;
  actorId: string;
  actorRole: UserRole;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: UserDTO;
  storeId: string;
  store?: StoreDTO;
  deliveryDate: string;
  deliverySlotId: string;
  deliverySlot?: DeliverySlotDTO;
  deliveryBatchId?: string | null;
  deliveryBatch?: DeliveryBatchDTO | null;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  addressSnapshot: {
    recipientName: string;
    phone: string;
    street: string;
    apartment?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  pricingSnapshot: {
    subtotal: number;
    discount: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
  items: OrderItemDTO[];
  timeline?: OrderStatusHistoryDTO[];
  deliveryOtp?: string; // Only visible to customer or in order confirmation
  driver?: DriverDTO | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DriverDTO {
  id: string;
  userId: string;
  user?: UserDTO;
  storeId: string;
  store?: StoreDTO;
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  status: DriverStatus;
  isAvailable: boolean;
  currentBatchId?: string | null;
  currentSlotWindow?: string | null;
  todayDeliveriesCount?: number;
  todayCompletedCount?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryBatchDTO {
  id: string;
  batchNumber: string;
  storeId: string;
  store?: StoreDTO;
  deliverySlotId: string;
  deliverySlot?: DeliverySlotDTO;
  driverId?: string | null;
  driver?: DriverDTO | null;
  status: BatchStatus;
  totalOrders: number;
  completedOrders: number;
  orders?: OrderDTO[];
  assignedAt?: string | null;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDTO {
  id: string;
  invoiceNumber: string;
  orderId: string;
  order?: OrderDTO;
  customerId: string;
  customer?: UserDTO;
  storeId: string;
  store?: StoreDTO;
  amount: number;
  taxAmount: number;
  fileUrl?: string | null;
  status: string;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  actorId: string;
  actorRole: UserRole;
  storeId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  channel: NotificationChannel;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardStatsDTO {
  todayOrders: number;
  todayRevenue: number;
  currentSlotWindow: string;
  ordersBySlot: Record<string, number>;
  openBatches: number;
  activeBatches: number;
  availableDrivers: number;
  busyDrivers: number;
  lowStockCount: number;
  outOfStockCount: number;
  completionRate: number;
}

export interface GodDashboardStatsDTO {
  totalStores: number;
  activeStores: number;
  totalCustomers: number;
  totalDrivers: number;
  todayOrders: number;
  todayRevenue: number;
  activeBatches: number;
  activeDeliveries: number;
  completedOrdersToday: number;
  cancelledOrdersToday: number;
  lowStockItemsTotal: number;
  outOfStockItemsTotal: number;
  slotUtilization: {
    slotWindow: string;
    booked: number;
    capacity: number;
    percentage: number;
  }[];
}
