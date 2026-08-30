import { Router } from 'express';
import { cartController } from './cart.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, cartController.getCart);
router.post('/items', authenticate, cartController.addItem);
router.patch('/items/:itemId', authenticate, cartController.updateItemQuantity);
router.delete('/', authenticate, cartController.clearCart);

export const cartRoutes = router;
