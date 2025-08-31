import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'supabase_session_token';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
let isLoggingIn = false;

export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: string;
  hasHardware: boolean;
  isEnrolled: boolean;
}

export const getBiometricCapability = async (): Promise<BiometricCapability> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let biometricType = 'Biometric';
    if (Platform.OS === 'ios') {
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face ID';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Touch ID';
      }
    } else {
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'Fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'Face Recognition';
      }
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
      biometricType: 'Biometric',
      hasHardware: false,
      isEnrolled: false
    };
  }
};

export const authenticateWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const capability = await getBiometricCapability();
    
    if (!capability.isAvailable) {
      return { success: false, error: 'Biometric authentication not available' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with your biometric',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || 'Authentication failed' };
    }
  } catch (error) {
    return { success: false, error: 'Authentication error' };
  }
};

export const storeSessionToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  } catch (error) {
    console.error('Failed to store session token:', error);
  }
};

export const getStoredSessionToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get session token:', error);
    return null;
  }
};

export const clearStoredSession = async (): Promise<void> => {
  try {
    if (isLoggingIn) {
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};

export const setLoginInProgress = (inProgress: boolean) => {
  isLoggingIn = inProgress;
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
};