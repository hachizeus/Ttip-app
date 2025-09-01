// Notifications hook disabled for Expo Go compatibility
import { useState, useEffect } from 'react';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    console.log('Notifications disabled for Expo Go');
  }, []);

  const refreshUnreadCount = () => {
    console.log('Notifications disabled for Expo Go');
  };

  return {
    expoPushToken,
    notification,
    unreadCount,
    refreshUnreadCount,
  };
}