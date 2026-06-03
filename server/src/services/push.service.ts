import { PushSubscriptionRequest } from '@nextask/types';
import webpush from 'web-push';

import { prisma } from '../lib/prisma';

// Initialize VAPID details
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

if (publicKey && privateKey && subject) {
  try {
    // Convert standard base64 from env into buffers, then to web-push's expected urlsafe-base64 format
    const pubKeyBuffer = Buffer.from(publicKey, 'base64');
    const privKeyBuffer = Buffer.from(privateKey, 'base64');

    // web-push expects URL-safe base64 strings
    const urlSafePublicKey = pubKeyBuffer.toString('base64url');
    const urlSafePrivateKey = privKeyBuffer.toString('base64url');

    webpush.setVapidDetails(subject, urlSafePublicKey, urlSafePrivateKey);
    console.log('✅ VAPID details successfully configured for Web Push.');
  } catch (err) {
    console.error('❌ Failed to configure VAPID details:', err);
  }
} else {
  console.warn('⚠️ VAPID environment variables not set. Push notifications will fail.');
}

export class PushService {
  /**
   * Retrieves the current VAPID public key (used by clients for subscribing)
   */
  static getPublicKey(): string | null {
    if (!publicKey) return null;
    try {
      // Return standard base64 (or buffer.toString('base64') as configured in env)
      return Buffer.from(publicKey, 'base64').toString('base64');
    } catch {
      return null;
    }
  }

  /**
   * Subscribes a device/user to push notifications
   */
  static async subscribe(userId: string, subscription: PushSubscriptionRequest) {
    // Delete any existing subscriptions with the same endpoint to avoid duplicates
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: subscription.endpoint },
    });

    return prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Unsubscribes a user's device/endpoint
   */
  static async unsubscribe(endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  /**
   * Sends a push notification payload to all subscriptions for a specific user
   */
  static async sendNotificationToUser(
    userId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (error: any) {
        // If subscription is expired or revoked (410 Gone / 404 Not Found), prune it from the DB
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🧹 Pruning expired push subscription for user ${userId}: ${sub.endpoint}`);
          await prisma.pushSubscription
            .delete({
              where: { id: sub.id },
            })
            .catch(() => {});
        } else {
          console.error(`❌ Failed to send push notification to subscription ${sub.id}:`, error);
        }
      }
    });

    await Promise.all(sendPromises);
  }
}
