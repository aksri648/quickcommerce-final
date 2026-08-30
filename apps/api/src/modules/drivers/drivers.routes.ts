import { Router } from 'express';
import { driversController } from './drivers.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { idempotency } from '../../middleware/idempotency';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get(
  '/',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF),
  driversController.listDrivers
);

router.get('/me', authenticate, requireRole(UserRole.DRIVER), driversController.getMyDriverProfile);
router.get('/:id', authenticate, driversController.getDriverById);

router.post(
  '/',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN),
  driversController.createDriver
);

router.post(
  '/batches/:batchId/assign',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN),
  idempotency(false),
  driversController.assignDriverToBatch
);

router.patch(
  '/me/status',
  authenticate,
  requireRole(UserRole.DRIVER),
  driversController.updateDriverStatus
);

export const driversRoutes = router;
