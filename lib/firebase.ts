// Firebase functionality disabled for Expo Go compatibility
export async function getFCMToken(): Promise<string | null> {
  console.log('Firebase disabled for Expo Go');
  return null;
}

export function setupFCMListener() {
  console.log('Firebase disabled for Expo Go');
}