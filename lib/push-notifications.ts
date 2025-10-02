import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class PushNotifications {
  static async registerForPushNotifications() {
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
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }

    return token;
  }

  static async sendPaymentNotification(amount: number, status: 'success' | 'failed') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: status === 'success' ? 'Payment Successful!' : 'Payment Failed',
        body: status === 'success' 
          ? `You received KSh ${amount} tip` 
          : `Payment of KSh ${amount} failed`,
        data: { amount, status },
      },
      trigger: { seconds: 1 },
    });
  }
}