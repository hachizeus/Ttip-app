import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBqJZ8Q7X8Q7X8Q7X8Q7X8Q7X8Q7X8Q7X8",
  authDomain: "ttip-89517.firebaseapp.com",
  projectId: "ttip-89517",
  storageBucket: "ttip-89517.appspot.com",
  messagingSenderId: "4240271040",
  appId: "1:4240271040:android:com.elitjohns.ttip"
};

const app = initializeApp(firebaseConfig);

export async function getFCMToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: 'BJ1RzUY13JvDBnj1sGj9Cfcw0AeHwCBzkDryppNJmHr-HSulih6fnIhbG5TU8iK0lDNuRgYOW1w_tq1lfgOuXKI'
      });
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

export function setupFCMListener() {
  if (Platform.OS === 'web') {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
    });
  }
}