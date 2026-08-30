import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { AddToCartSchema, UpdateCartItemSchema } from '@quickcommerce/shared';

export class CartController {
  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const cart = await cartService.getCart(req.user!.id);
      return res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = AddToCartSchema.parse(req.body);
      const cart = await cartService.addItem(req.user!.id, validated.storeId, validated.productId, validated.quantity);
      return res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }

  async updateItemQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = UpdateCartItemSchema.parse(req.body);
      const cart = await cartService.updateItemQuantity(req.user!.id, req.params.itemId, validated.quantity);
      return res.json({ success: true, data: cart });
    } catch (err) {
      next(err);
    }
  }

  async clearCart(req: Request, res: Response, next: NextFunction) {
    try {
      await cartService.clearCart(req.user!.id);
      return res.json({ success: true, message: 'Cart cleared' });
    } catch (err) {
      next(err);
    }
  }
}

export const cartController = new CartController();
