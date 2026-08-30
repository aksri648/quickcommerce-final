import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get('/store/:storeId', authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN, UserRole.STORE_STAFF), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getStoreDashboardStats(req.params.storeId);
    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

router.get('/god-dashboard', authenticate, requireRole(UserRole.SUPER_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await analyticsService.getGodDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

export const analyticsRoutes = router;
