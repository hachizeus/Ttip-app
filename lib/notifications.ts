import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  data?: any;
}

export async function registerForPushNotificationsAsync() {
  // Skip push notifications on web
  if (Platform.OS === 'web') {
    return null;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  }

  return token;
}

export async function sendLocalNotification(title: string, message: string, data?: any) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: message,
      data,
      badge: await getUnreadCount() + 1,
    },
    trigger: null,
  });
}

export async function saveNotification(title: string, message: string, data?: any) {
  const phone = await getCurrentUser();
  if (!phone) return;

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: phone,
      title,
      message,
      status: 'unread',
      data: data ? JSON.stringify(data) : null,
    });

  if (error) {
    console.error('Error saving notification:', error);
  }
}

export async function getNotifications(): Promise<NotificationData[]> {
  const phone = await getCurrentUser();
  if (!phone) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', phone)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data || [];
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'read' })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }

  // Update badge count
  const unreadCount = await getUnreadCount();
  await Notifications.setBadgeCountAsync(unreadCount);
}

export async function getUnreadCount(): Promise<number> {
  const phone = await getCurrentUser();
  if (!phone) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', phone)
    .eq('status', 'unread');

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

export async function checkMilestones(newTotal: number, previousTotal: number) {
  const milestones = [
    { amount: 500, message: "🎉 Congratulations! You've reached KSh 500 in tips. Keep going!" },
    { amount: 1000, message: "🔥 Amazing! You've crossed KSh 1,000 in tips." },
    { amount: 10000, message: "🏆 Incredible! You're among the top earners with KSh 10,000 in tips!" },
  ];

  for (const milestone of milestones) {
    if (newTotal >= milestone.amount && previousTotal < milestone.amount) {
      const title = `Milestone Reached: KSh ${milestone.amount.toLocaleString()}`;
      await sendLocalNotification(title, milestone.message);
      await saveNotification(title, milestone.message, { type: 'milestone', amount: milestone.amount });
    }
  }
}

export async function notifyTipReceived(amount: number, tipperPhone?: string) {
  const title = "New Tip Received! 💰";
  const message = `You received KSh ${amount.toLocaleString()} tip`;
  
  await sendLocalNotification(title, message);
  await saveNotification(title, message, { type: 'tip', amount, tipperPhone });
}