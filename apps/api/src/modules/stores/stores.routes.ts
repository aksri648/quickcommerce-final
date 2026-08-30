import { Router } from 'express';
import { storesController } from './stores.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

// Public / Customer store routes
router.get('/', optionalAuth, storesController.listStores);
router.get('/:id', optionalAuth, storesController.getStoreById);

// Admin-only store mutation routes
router.post('/', authenticate, requireRole(UserRole.SUPER_ADMIN), storesController.createStore);
router.patch('/:id', authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN), storesController.updateStore);

export const storesRoutes = router;
