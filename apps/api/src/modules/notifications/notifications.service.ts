import { prisma } from '../../database/prisma';
import { NotificationChannel } from '@quickcommerce/shared';

export class NotificationsService {
  async sendNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: string;
    channel?: NotificationChannel;
    metadata?: any;
  }) {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'SYSTEM',
        channel: params.channel || NotificationChannel.IN_APP,
        metadata: params.metadata,
      },
    });
  }

  async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } })
    ]);
    return {
      notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}

export const notificationsService = new NotificationsService();
