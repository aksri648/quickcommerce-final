import { Router } from 'express';
import { batchesController } from './batches.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { idempotency } from '../../middleware/idempotency';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF, UserRole.DRIVER),
  batchesController.listBatches
);

router.get(
  '/:id',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF, UserRole.DRIVER),
  batchesController.getBatchById
);

router.post(
  '/',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF),
  batchesController.createBatch
);

router.post(
  '/:id/dispatch',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF, UserRole.DRIVER),
  idempotency(false),
  batchesController.dispatchBatch
);

export const batchesRoutes = router;
