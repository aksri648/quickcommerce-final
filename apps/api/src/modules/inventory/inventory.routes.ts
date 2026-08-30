import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole, requireStoreScope } from '../../middleware/rbac';
import { idempotency } from '../../middleware/idempotency';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get(
  '/store/:storeId',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF),
  requireStoreScope('storeId'),
  inventoryController.getStoreInventory
);

router.get(
  '/:inventoryId/movements',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN),
  inventoryController.getMovements
);

router.post(
  '/adjust',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN),
  requireStoreScope('storeId'),
  idempotency(false),
  inventoryController.adjustInventory
);

export const inventoryRoutes = router;
