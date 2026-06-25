import type { Request as ExRequest } from 'express';
import {
  Controller,
  Get,
  Patch,
  Path,
  Post,
  Request,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa';

import { NotificationService } from '../services/notification.service';
import { successResponse } from '../utils/response.util';

@Route('notifications')
@Tags('Notifications')
@Security('jwt')
export class NotificationController extends Controller {
  private notificationService: NotificationService;

  constructor() {
    super();
    this.notificationService = new NotificationService();
  }

  /**
   * Retrieves all notifications for the authenticated user (limit 50).
   */
  @SuccessResponse('200', 'OK')
  @Get('/')
  public async getNotifications(@Request() request: ExRequest): Promise<any> {
    const { userId } = (request as any).user;
    const notifications = await this.notificationService.getUserNotifications(userId);
    return successResponse('Notifications retrieved successfully.', notifications);
  }

  /**
   * Marks a specific notification as read.
   */
  @SuccessResponse('200', 'OK')
  @Patch('{id}/read')
  public async markAsRead(@Path() id: string, @Request() request: ExRequest): Promise<any> {
    const { userId } = (request as any).user;
    const notif = await this.notificationService.markAsRead(userId, id);
    return successResponse('Notification marked as read.', notif);
  }

  /**
   * Marks all notifications of the authenticated user as read.
   */
  @SuccessResponse('200', 'OK')
  @Post('mark-all-read')
  public async markAllAsRead(@Request() request: ExRequest): Promise<any> {
    const { userId } = (request as any).user;
    await this.notificationService.markAllAsRead(userId);
    return successResponse('All notifications marked as read.', null);
  }
}
