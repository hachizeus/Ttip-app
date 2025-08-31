import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, getUnreadCount } from '../lib/notifications';
import { registerForFirebasePushNotifications } from '../lib/firebaseNotifications';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for both Expo and Firebase notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) setExpoPushToken(token);
    });
    
    registerForFirebasePushNotifications().then(token => {
      console.log('Firebase token registered:', token);
    });

    // Load initial unread count
    loadUnreadCount();

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      loadUnreadCount(); // Refresh count when new notification arrives
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle notification tap
      const data = response.notification.request.content.data;
      if (data?.type === 'tip') {
        // Navigate to tip details or home
      } else if (data?.type === 'milestone') {
        // Navigate to achievements or analytics
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const loadUnreadCount = async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
    await Notifications.setBadgeCountAsync(count);
  };

  const refreshUnreadCount = () => {
    loadUnreadCount();
  };

  return {
    expoPushToken,
    notification,
    unreadCount,
    refreshUnreadCount,
  };
}