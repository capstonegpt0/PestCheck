// src/utils/pushNotifications.js
import api from './api';

/**
 * Request push notification permission and subscribe
 */
export async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Push notification permission denied');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Use VAPID public key if available, otherwise fall back to simple push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkGs-GDq6QAKdlFY8iZTDFLp_tMz0HJjUMen18KXAM'
      )
    });

    // Send subscription to backend
    await api.post('/auth/push-subscription/', {
      subscription: JSON.parse(JSON.stringify(subscription))
    });

    console.log('Push subscription registered');
    return true;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return false;
  }
}

/**
 * Check if push is currently subscribed
 */
export async function isPushSubscribed() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Show a local notification (for in-app triggered notifications)
 */
export function showLocalNotification(title, body, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        tag: options.tag || 'pestcheck-notification',
        ...options
      });
    });
  }
}

/**
 * Helper to convert VAPID key
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}