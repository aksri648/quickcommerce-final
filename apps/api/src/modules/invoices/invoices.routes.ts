import { Router, Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { UserRole } from '@quickcommerce/shared';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storeId = req.user?.role === UserRole.CUSTOMER ? undefined : ((req.query.storeId as string) || req.user?.storeId);
    const customerId = req.user?.role === UserRole.CUSTOMER ? req.user.id : (req.query.customerId as string);
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await invoicesService.listInvoices({ storeId, customerId, page, limit });
    return res.json({ success: true, data: result.invoices, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await invoicesService.getInvoiceById(req.params.id);
    return res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

export const invoicesRoutes = router;
