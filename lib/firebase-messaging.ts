import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
    return true;
  }
  return false;
}

export async function getFCMToken() {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    
    // Save token to database
    const phone = await getCurrentUser();
    if (phone && token) {
      await supabase
        .from('workers')
        .update({ fcm_token: token })
        .eq('phone', phone);
    }
    
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function setupMessageHandlers() {
  // Handle background messages
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });

  // Handle foreground messages
  messaging().onMessage(async remoteMessage => {
    console.log('A new FCM message arrived!', remoteMessage);
  });

  // Handle notification opened app
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification caused app to open from background state:', remoteMessage);
  });

  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('Notification caused app to open from quit state:', remoteMessage);
      }
    });
}