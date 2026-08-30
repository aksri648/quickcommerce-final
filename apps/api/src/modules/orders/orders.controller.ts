import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { CheckoutOrderSchema, UpdateOrderStatusSchema, OrderStatus } from '@quickcommerce/shared';

export class OrdersController {
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CheckoutOrderSchema.parse(req.body);
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
      const order = await ordersService.checkout(req.user!.id, validated, idempotencyKey);
      return res.status(201).json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async listOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.listOrders({
        userId: req.user!.id,
        role: req.user!.role,
        storeId: (req.query.storeId as string) || req.user!.storeId,
        status: req.query.status as OrderStatus | undefined,
        deliveryDate: req.query.deliveryDate as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      return res.json({ success: true, data: result.orders, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.getOrderById(
        req.params.id,
        req.user!.id,
        req.user!.role,
        req.user!.storeId
      );
      return res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = UpdateOrderStatusSchema.parse(req.body);
      const order = await ordersService.updateOrderStatus(
        req.params.id,
        validated,
        req.user!.id,
        req.user!.role
      );
      return res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
}

export const ordersController = new OrdersController();
