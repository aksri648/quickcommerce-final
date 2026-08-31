import { Router, Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await notificationsService.getUserNotifications(req.user!.id, page, limit);
    return res.json({ success: true, data: result.notifications, meta: result.meta });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/read', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationsService.markAsRead(req.params.id, req.user!.id);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
});

export const notificationsRoutes = router;
