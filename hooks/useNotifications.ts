import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount, getNotifications, markAsRead } from '../lib/notifications';
import { getCurrentUser } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const notifs = await getNotifications();
      setNotifications(notifs);
      const unreadCount = notifs.filter(n => n.status === 'unread').length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const phone = await getCurrentUser();
      if (!phone) return;

      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', phone)
        .eq('status', 'unread');

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    
    // Set up real-time subscription for notifications
    const setupRealtimeSubscription = async () => {
      const phone = await getCurrentUser();
      if (!phone) return;

      const subscription = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${phone}`
          },
          (payload) => {
            console.log('Notification change:', payload);
            refreshNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    setupRealtimeSubscription();
  }, [refreshNotifications]);

  return {
    expoPushToken,
    notification,
    notifications,
    unreadCount,
    loading,
    refreshUnreadCount,
    refreshNotifications,
    markNotificationAsRead,
    markAllAsRead,
  };
}