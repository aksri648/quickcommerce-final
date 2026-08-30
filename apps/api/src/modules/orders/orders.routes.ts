import { Router } from 'express';
import { ordersController } from './orders.controller';
import { authenticate } from '../../middleware/auth';
import { idempotency } from '../../middleware/idempotency';
import { checkoutRateLimiter } from '../../middleware/rate-limiter';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

// Customer checkout
router.post('/checkout', authenticate, checkoutRateLimiter, idempotency(false), ordersController.checkout);

// List & view orders
router.get('/', authenticate, ordersController.listOrders);
router.get('/:id', authenticate, ordersController.getOrderById);

// Update order status (Admin / Staff / Driver)
router.patch(
  '/:id/status',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF, UserRole.DRIVER),
  ordersController.updateOrderStatus
);

export const ordersRoutes = router;
