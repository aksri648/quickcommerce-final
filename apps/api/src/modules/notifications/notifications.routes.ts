import { Router, Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationsService.getUserNotifications(req.user!.id);
    return res.json({ success: true, data: notifications });
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
