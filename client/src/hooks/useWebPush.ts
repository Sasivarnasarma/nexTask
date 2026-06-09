import { ApiResponse, PushSubscriptionRequest } from '@nextask/types';
import { useCallback, useEffect, useState } from 'react';

import apiClient from '@/api/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  );
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const checkCurrentSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking current push subscription:', err);
    }
  }, []);

  // Check current subscription on mount
  useEffect(() => {
    if (isSupported) {
      checkCurrentSubscription();
    }
  }, [isSupported, checkCurrentSubscription]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsPending(true);

    try {
      // 1. Request permission
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        throw new Error('Notification permission denied.');
      }

      // 2. Register Service Worker and wait for it to be ready
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID key from the backend
      const keyResponse = await apiClient.get<ApiResponse<{ publicKey: string }>>('/push/key');
      const vapidPublicKey = keyResponse.data.data?.publicKey;
      if (!vapidPublicKey) {
        throw new Error('Failed to retrieve VAPID public key.');
      }

      // 4. Subscribe with PushManager
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 5. Convert subscription to JSON and type it
      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Failed to generate full subscription payload.');
      }

      const payload: PushSubscriptionRequest = {
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      };

      // 6. Save subscription on backend
      await apiClient.post('/push/subscribe', payload);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Failed to subscribe to Web Push:', err);
      return false;
    } finally {
      setIsPending(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsPending(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        // Unsubscribe locally first, then remove the subscription from the backend database
        await subscription.unsubscribe();
        await apiClient.post('/push/unsubscribe', { endpoint });
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from Web Push:', err);
      return false;
    } finally {
      setIsPending(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isPending,
    subscribe,
    unsubscribe,
  };
}
