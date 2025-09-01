// Firebase messaging disabled for Expo Go compatibility
export async function requestUserPermission() {
  console.log('Firebase messaging disabled for Expo Go');
  return false;
}

export async function getFCMToken() {
  console.log('Firebase messaging disabled for Expo Go');
  return null;
}

export function setupMessageHandlers() {
  console.log('Firebase messaging disabled for Expo Go');
}