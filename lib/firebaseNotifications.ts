import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export async function registerForFirebasePushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

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

  token = (await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
  })).data;

  // Store token in database
  await storeFCMToken(token);
  
  return token;
}

async function storeFCMToken(token: string) {
  const phone = await getCurrentUser();
  if (!phone) return;

  const { error } = await supabase
    .from('workers')
    .update({ fcm_token: token })
    .eq('phone', phone);

  if (error) {
    console.error('Error storing FCM token:', error);
  }
}

export async function sendPushNotification(
  userPhone: string,
  title: string,
  body: string,
  data?: any
) {
  try {
    // Get user's FCM token
    const { data: worker, error } = await supabase
      .from('workers')
      .select('fcm_token')
      .eq('phone', userPhone)
      .single();

    if (error || !worker?.fcm_token) {
      console.error('No FCM token found for user:', userPhone);
      return;
    }

    // Send via Expo push service (which handles FCM)
    const message = {
      to: worker.fcm_token,
      sound: 'default',
      title,
      body,
      data,
      badge: await getUnreadCount(userPhone) + 1,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

async function getUnreadCount(userPhone: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userPhone)
    .eq('status', 'unread');

  return count || 0;
}

export async function sendTipNotification(userPhone: string, amount: number) {
  const title = "New Tip Received! 💰";
  const body = `You received KSh ${amount.toLocaleString()} tip`;
  
  await sendPushNotification(userPhone, title, body, {
    type: 'tip',
    amount,
  });
}

export async function sendMilestoneNotification(userPhone: string, milestone: number) {
  const messages = {
    500: "🎉 Congratulations! You've reached KSh 500 in tips. Keep going!",
    1000: "🔥 Amazing! You've crossed KSh 1,000 in tips.",
    10000: "🏆 Incredible! You're among the top earners with KSh 10,000 in tips!"
  };

  const title = `Milestone Reached: KSh ${milestone.toLocaleString()}`;
  const body = messages[milestone as keyof typeof messages] || `You've reached KSh ${milestone.toLocaleString()} in tips!`;
  
  await sendPushNotification(userPhone, title, body, {
    type: 'milestone',
    amount: milestone,
  });
}

export async function sendSubscriptionReminder(userPhone: string) {
  const title = "Subscription Reminder";
  const body = "Your free trial has ended. Subscribe now to continue receiving tips.";
  
  await sendPushNotification(userPhone, title, body, {
    type: 'subscription',
  });
}