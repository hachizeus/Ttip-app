// Firebase notifications disabled for Expo Go compatibility
export async function registerForFirebasePushNotifications() {
  console.log('Firebase notifications disabled for Expo Go');
  return null;
}

export async function sendPushNotification(userPhone: string, title: string, body: string, data?: any) {
  console.log('Firebase notifications disabled for Expo Go');
}

export async function sendTipNotification(userPhone: string, amount: number) {
  console.log('Firebase notifications disabled for Expo Go');
}

export async function sendMilestoneNotification(userPhone: string, milestone: number) {
  console.log('Firebase notifications disabled for Expo Go');
}

export async function sendSubscriptionReminder(userPhone: string) {
  console.log('Firebase notifications disabled for Expo Go');
}