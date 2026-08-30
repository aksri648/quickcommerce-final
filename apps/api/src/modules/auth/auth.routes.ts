import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/dev-login', authController.devLogin);
router.get('/me', authenticate, authController.getMe);

export const authRoutes = router;
