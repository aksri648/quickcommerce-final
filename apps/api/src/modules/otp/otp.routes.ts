import { Router } from 'express';
import { otpController } from './otp.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { otpRateLimiter } from '../../middleware/rate-limiter';
import { idempotency } from '../../middleware/idempotency';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.post(
  '/verify',
  authenticate,
  requireRole(UserRole.DRIVER),
  otpRateLimiter,
  idempotency(false),
  otpController.verifyOtp
);

export const otpRoutes = router;
