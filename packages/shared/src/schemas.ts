import { z } from 'zod';
import { UserRole, OrderStatus, PaymentMethod, BatchStatus, InventoryMovementType, DriverStatus } from './enums';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const StoreFilterSchema = PaginationSchema.extend({
  isActive: z.coerce.boolean().optional(),
  city: z.string().trim().optional(),
});

export const CreateStoreSchema = z.object({
  code: z.string().trim().min(2).max(20).toUpperCase(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().length(6),
  phone: z.string().trim().min(10).max(15),
  email: z.string().trim().email().max(255),
  isActive: z.boolean().default(true),
  openingTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (e.g. 07:00)'),
  closingTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm (e.g. 23:00)'),
  timezone: z.string().trim().default('Asia/Kolkata'),
});

export const UpdateStoreSchema = CreateStoreSchema.partial().extend({
  version: z.number().int().min(0).optional(),
});

export const ProductFilterSchema = PaginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  brand: z.string().trim().optional(),
  inStockOnly: z.coerce.boolean().optional(),
});

export const CreateProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional(),
  brand: z.string().trim().min(1).max(100),
  unit: z.string().trim().min(1).max(50), // e.g. "500 g", "1 L", "Pack of 2"
  mrp: z.number().positive(),
  basePrice: z.number().positive(),
  imageUrl: z.string().trim().url().max(1000).optional(),
  isActive: z.boolean().default(true),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  version: z.number().int().min(0).optional(),
});

export const InventoryAdjustmentSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.enum([
    InventoryMovementType.MANUAL_ADD,
    InventoryMovementType.MANUAL_REMOVE,
    InventoryMovementType.ADJUSTMENT,
    InventoryMovementType.RESTOCK
  ]),
  quantity: z.number().int(), // For ADJUSTMENT, represents new absolute quantity; for others, the delta
  reason: z.string().trim().min(3).max(255),
  expectedVersion: z.number().int().min(0).optional(),
});

export const DeliverySlotFilterSchema = z.object({
  storeId: z.string().uuid(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
});

export const UpdateSlotCapacitySchema = z.object({
  capacity: z.number().int().min(1).max(10000),
  bookingCutoffMinutes: z.number().int().min(0).max(1440).optional(),
  isActive: z.boolean().optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const AddToCartSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const CreateAddressSchema = z.object({
  type: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(15),
  street: z.string().trim().min(5).max(255),
  apartment: z.string().trim().max(100).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().trim().length(6),
  isDefault: z.boolean().default(false),
});

export const CheckoutOrderSchema = z.object({
  storeId: z.string().uuid(),
  addressId: z.string().uuid(),
  deliveryDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  deliverySlotId: z.string().uuid(),
  paymentMethod: z.literal(PaymentMethod.COD).default(PaymentMethod.COD),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(20),
    })
  ).min(1, 'Cart cannot be empty').max(100, 'Cart too large'),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().trim().max(255).optional(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const CreateDeliveryBatchSchema = z.object({
  storeId: z.string().uuid(),
  deliverySlotId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1, 'At least one order required to create a batch').max(50),
});

export const AssignDriverSchema = z.object({
  driverId: z.string().uuid(),
  expectedVersion: z.number().int().min(0).optional(),
});

export const VerifyOTPSchema = z.object({
  orderId: z.string().uuid(),
  otp: z.string().trim().length(6, 'OTP must be 6 digits'),
});

export const DriverStatusUpdateSchema = z.object({
  status: z.enum([DriverStatus.AVAILABLE, DriverStatus.BUSY, DriverStatus.OFFLINE]),
});

export const CreateStaffSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(15).optional(),
  storeId: z.string().uuid(),
  role: z.enum([UserRole.STORE_ADMIN, UserRole.STORE_STAFF]),
});

export const CreateDriverSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(15),
  storeId: z.string().uuid(),
  vehicleType: z.string().trim().min(2).max(50), // e.g. "Two Wheeler", "Electric Scooter"
  vehicleNumber: z.string().trim().min(4).max(20),
  licenseNumber: z.string().trim().min(5).max(50),
});

export const DevLoginSchema = z.object({
  role: z.nativeEnum(UserRole),
  email: z.string().trim().email().max(255).optional(),
  storeId: z.string().uuid().optional(),
});
