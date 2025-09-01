// Biometric auth disabled for Expo Go compatibility
export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: string;
  hasHardware: boolean;
  isEnrolled: boolean;
}

export const getBiometricCapability = async (): Promise<BiometricCapability> => {
  return {
    isAvailable: false,
    biometricType: 'Disabled',
    hasHardware: false,
    isEnrolled: false
  };
};

export const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
  return { success: false, error: 'Biometric auth disabled for Expo Go' };
};

export const storeSessionToken = async (token: string): Promise<void> => {
  console.log('Biometric auth disabled for Expo Go');
};

export const getStoredSessionToken = async (): Promise<string | null> => {
  return null;
};

export const clearStoredSession = async (): Promise<void> => {
  console.log('Biometric auth disabled for Expo Go');
};

export const setLoginInProgress = (inProgress: boolean) => {
  console.log('Biometric auth disabled for Expo Go');
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  return false;
};