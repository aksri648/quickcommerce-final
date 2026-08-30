import { Router } from 'express';
import { productsController } from './products.controller';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

// Public / Customer Catalog & Search routes
router.get('/categories', optionalAuth, productsController.listCategories);
router.get('/search', optionalAuth, productsController.searchProducts);
router.get('/search/suggestions', optionalAuth, productsController.getSuggestions);
router.get('/', optionalAuth, productsController.listProducts);
router.get('/:id', optionalAuth, productsController.getProductById);

// Admin-only Catalog mutations
router.post('/', authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN), productsController.createProduct);
router.patch('/:id', authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN), productsController.updateProduct);

export const productsRoutes = router;
