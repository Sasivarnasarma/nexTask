import { PushSubscriptionRequest } from '@nextask/types';
import type { Request as ExRequest } from 'express';
import { Body, Controller, Get, Post, Request, Route, Security, SuccessResponse, Tags } from 'tsoa';

import { PushService } from '../services/push.service';
import { ApiError } from '../utils/apiError.util';
import { ApiResponse, successResponse } from '../utils/response.util';

@Route('push')
@Tags('Push Notifications')
@Security('jwt')
export class PushController extends Controller {
  /**
   * Retrieves the VAPID Public Key needed to subscribe to push notifications.
   */
  @Get('key')
  public async getPublicKey(): Promise<ApiResponse<{ publicKey: string }>> {
    const key = PushService.getPublicKey();
    if (!key) {
      throw new ApiError(500, 'Web push configuration is incomplete. VAPID public key not found.');
    }
    return successResponse('VAPID public key retrieved successfully.', { publicKey: key });
  }

  /**
   * Subscribes the current user's device/browser to push notifications.
   */
  @Post('subscribe')
  @SuccessResponse('201', 'Subscribed')
  public async subscribe(
    @Body() subscription: PushSubscriptionRequest,
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId } = (request as any).user;
    await PushService.subscribe(userId, subscription);
    this.setStatus(201);
    return successResponse('Subscribed to push notifications successfully.', null);
  }

  /**
   * Unsubscribes the current user's device/browser from push notifications.
   */
  @Post('unsubscribe')
  public async unsubscribe(
    @Body() body: { endpoint: string },
    @Request() request: ExRequest,
  ): Promise<ApiResponse<null>> {
    const { userId } = (request as any).user;
    await PushService.unsubscribe(userId, body.endpoint);
    return successResponse('Unsubscribed from push notifications successfully.', null);
  }
}
