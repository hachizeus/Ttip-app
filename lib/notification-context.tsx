import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from './auth';
import { supabase } from './supabase';
import { getUnreadCount } from './notifications';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  };

  const incrementUnreadCount = () => {
    setUnreadCount(prev => prev + 1);
  };

  const decrementUnreadCount = () => {
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  useEffect(() => {
    refreshUnreadCount();

    // Set up real-time subscription
    const setupRealtimeSubscription = async () => {
      const phone = await getCurrentUser();
      if (!phone) return;

      const subscription = supabase
        .channel('notification_count')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${phone}`
          },
          () => {
            incrementUnreadCount();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${phone}`
          },
          (payload) => {
            // If status changed from unread to read, decrement
            if (payload.old?.status === 'unread' && payload.new?.status === 'read') {
              decrementUnreadCount();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    setupRealtimeSubscription();
  }, []);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      refreshUnreadCount,
      incrementUnreadCount,
      decrementUnreadCount,
      resetUnreadCount,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}