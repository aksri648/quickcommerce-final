import { Router } from 'express';
import { slotsController } from './slots.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

// Public / Customer slot availability endpoint
router.get('/', optionalAuth, slotsController.getSlots);

// Admin slot capacity update
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN),
  slotsController.updateSlotConfig
);

export const slotsRoutes = router;
