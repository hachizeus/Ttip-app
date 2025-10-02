import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: string;
  hasHardware: boolean;
  isEnrolled: boolean;
}

let loginInProgress = false;

export const getBiometricCapability = async (): Promise<BiometricCapability> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let biometricType = 'Biometric';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'Face ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'Fingerprint';
    }
    
    return {
      isAvailable: hasHardware && isEnrolled,
      biometricType,
      hasHardware,
      isEnrolled
    };
  } catch (error) {
    return {
      isAvailable: false,
      biometricType: 'Unavailable',
      hasHardware: false,
      isEnrolled: false
    };
  }
};

export const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const capability = await getBiometricCapability();
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in with ${capability.biometricType}`,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode'
    });
    
    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Authentication failed' };
    }
  } catch (error) {
    return { success: false, error: 'Biometric authentication failed' };
  }
};

export const storeSessionToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('biometric_session_token', token);
  } catch (error) {
    console.error('Failed to store session token:', error);
  }
};

export const getStoredSessionToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('biometric_session_token');
  } catch (error) {
    console.error('Failed to get session token:', error);
    return null;
  }
};

export const clearStoredSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('biometric_session_token');
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

export const setLoginInProgress = (inProgress: boolean) => {
  loginInProgress = inProgress;
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  const capability = await getBiometricCapability();
  return capability.isAvailable;
};

export const isLoginInProgress = (): boolean => {
  return loginInProgress;
};