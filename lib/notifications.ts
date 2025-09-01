// Notifications disabled for Expo Go compatibility
import { getCurrentUser } from './auth';
import { supabase } from './supabase';

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
  console.log('Notifications disabled for Expo Go');
  return null;
}

export async function sendLocalNotification(title: string, message: string, data?: any) {
  console.log('Local notifications disabled for Expo Go');
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
  console.log('Milestone notifications disabled for Expo Go');
}

export async function notifyTipReceived(amount: number, tipperPhone?: string) {
  console.log('Tip notifications disabled for Expo Go');
}