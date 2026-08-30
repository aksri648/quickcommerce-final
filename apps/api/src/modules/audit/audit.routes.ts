import { Router, Request, Response, NextFunction } from 'express';
import { auditService } from './audit.service';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get('/', authenticate, requireRole(UserRole.SUPER_ADMIN, UserRole.STORE_ADMIN), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user?.role === UserRole.SUPER_ADMIN ? (req.query.storeId as string) : req.user?.storeId;
    const entityType = req.query.entityType as string;
    const actorId = req.query.actorId as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await auditService.listLogs({ storeId, entityType, actorId, page, limit });
    return res.json({ success: true, data: result.logs, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

export const auditRoutes = router;
