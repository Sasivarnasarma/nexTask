import { NotificationType } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { PushService } from './push.service';

export class NotificationService {
  /**
   * Creates an in-app notification and sends a push notification.
   */
  public static async createNotification(
    userId: string,
    message: string,
    type: NotificationType,
    taskId?: string,
  ) {
    // 1. Save to DB
    const notif = await prisma.notification.create({
      data: {
        userId,
        message,
        type,
        taskId,
        isRead: false,
      },
    });

    // 2. Send Web Push asynchronously
    try {
      await PushService.sendNotificationToUser(userId, {
        title: this.getTitleForType(type),
        body: message,
        data: { taskId },
      });
    } catch (err) {
      console.error('[PUSH_ERROR] Failed to send push notification:', err);
    }

    return notif;
  }

  /**
   * Fetches notifications for a user.
   */
  public async getUserNotifications(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Marks a notification as read.
   */
  public async markAsRead(userId: string, notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications as read for a user.
   */
  public async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  private static getTitleForType(type: NotificationType): string {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
        return 'Task Assigned';
      case NotificationType.STATUS_CHANGED:
        return 'Task Status Updated';
      case NotificationType.DEADLINE_ALERT:
        return 'Task Deadline Alert';
      case NotificationType.COMMENT_ADDED:
        return 'New Comment Added';
      case NotificationType.ADMIN_UPDATE:
      default:
        return 'Notification';
    }
  }
}
