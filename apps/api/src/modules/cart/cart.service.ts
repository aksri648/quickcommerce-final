import { prisma, withTransactionRetry } from '../../database/prisma';
import {
  ErrorCodes,
  TAX_RATE_PERCENTAGE,
  BASE_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
} from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';

export class CartService {
  async getCart(customerId: string) {
    const cart = await prisma.cart.findUnique({
      where: { customerId },
      include: {
        store: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
                storeProducts: true,
                inventory: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return null;
    }

    // Authoritative server-side price recalculation
    let subtotal = 0;
    const mappedItems = cart.items.map((item) => {
      const sp = item.product.storeProducts.find((s) => s.storeId === cart.storeId);
      const inv = item.product.inventory.find((i) => i.storeId === cart.storeId);
      const unitPrice = sp ? Number(sp.price) : Number(item.product.basePrice);
      const itemTotal = unitPrice * item.quantity;
      const availableQuantity = inv ? Math.max(0, inv.quantity - inv.reservedQuantity) : 0;

      subtotal += itemTotal;

      return {
        id: item.id,
        productId: item.productId,
        product: {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          brand: item.product.brand,
          unit: item.product.unit,
          mrp: Number(item.product.mrp),
          basePrice: Number(item.product.basePrice),
          storePrice: unitPrice,
          imageUrl: item.product.imageUrl,
          availableQuantity,
          isAvailableInStore: sp ? sp.isAvailable : true,
        },
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      };
    });

    const discount = 0;
    const tax = Math.round((subtotal * (TAX_RATE_PERCENTAGE / 100)) * 100) / 100;
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    const grandTotal = Math.round((subtotal - discount + tax + deliveryFee) * 100) / 100;

    return {
      id: cart.id,
      customerId: cart.customerId,
      storeId: cart.storeId,
      store: cart.store,
      items: mappedItems,
      itemCount: mappedItems.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      discount,
      tax,
      deliveryFee,
      grandTotal,
    };
  }

  async addItem(customerId: string, storeId: string, productId: string, quantity: number) {
    await withTransactionRetry(async (tx) => {
      // 1. Verify store is active
      const store = await tx.store.findUnique({ where: { id: storeId } });
      if (!store || !store.isActive) {
        throw new AppError(ErrorCodes.STORE_INACTIVE, 'Selected store is inactive or unavailable', 400);
      }

      // 2. Verify product exists & check stock
      const inv = await tx.inventory.findUnique({
        where: { storeId_productId: { storeId, productId } },
      });
      const available = inv ? inv.quantity - inv.reservedQuantity : 0; // Default demo fallback removed for real stores
      if (available < quantity) {
        throw new AppError(ErrorCodes.OUT_OF_STOCK, 'Requested quantity exceeds available stock', 400);
      }

      // 3. Find or create cart
      let cart = await tx.cart.findUnique({ where: { customerId } });

      if (cart && cart.storeId !== storeId) {
        // Clear items if adding from a different store
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        cart = await tx.cart.update({
          where: { id: cart.id },
          data: { storeId },
        });
      } else if (!cart) {
        cart = await tx.cart.create({
          data: {
            customerId,
            storeId,
          },
        });
      }

      if (quantity <= 0) {
        throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Quantity must be positive', 400);
      }

      // 4. Upsert cart item
      await tx.cartItem.upsert({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId,
          },
        },
        create: {
          cartId: cart.id,
          productId,
          quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      });
    });

    return await this.getCart(customerId);
  }

  async updateItemQuantity(customerId: string, cartItemId: string, quantity: number) {
    await withTransactionRetry(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: cartItemId },
        include: { cart: true },
      });

      if (!item || item.cart.customerId !== customerId) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Cart item not found', 404);
      }

      if (quantity <= 0) {
        await tx.cartItem.delete({ where: { id: cartItemId } });
      } else {
        await tx.cartItem.update({
          where: { id: cartItemId },
          data: { quantity },
        });
      }
    });

    return await this.getCart(customerId);
  }

  async clearCart(customerId: string) {
    const cart = await prisma.cart.findUnique({ where: { customerId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { success: true };
  }
}

export const cartService = new CartService();
