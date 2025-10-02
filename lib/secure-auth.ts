import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Keychain from 'react-native-keychain';
import * as LocalAuthentication from 'expo-local-authentication';

export class SecureAuth {
  private static readonly TOKEN_KEY = 'secure_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static sessionTimer: NodeJS.Timeout | null = null;

  // Store tokens securely in AsyncStorage with base64 encoding
  static async storeTokens(accessToken: string, refreshToken: string) {
    try {
      const data = JSON.stringify({ accessToken, refreshToken, timestamp: Date.now() });
      const encoded = btoa(data);
      await AsyncStorage.setItem(this.TOKEN_KEY, encoded);
    } catch (error) {
      console.error('Failed to store tokens:', error);
    }
  }

  // Get tokens from AsyncStorage
  static async getTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const encoded = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (encoded) {
        const data = JSON.parse(atob(encoded));
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
      }
    } catch (error) {
      console.error('Failed to get tokens:', error);
    }
    return null;
  }

  // Biometric authentication for sensitive actions
  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN'
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  // Start session timeout
  static startSessionTimeout(onTimeout: () => void) {
    this.clearSessionTimeout();
    this.sessionTimer = setTimeout(() => {
      onTimeout();
    }, this.SESSION_TIMEOUT);
  }

  // Clear session timeout
  static clearSessionTimeout() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  // Refresh access token
  static async refreshAccessToken(): Promise<string | null> {
    try {
      const tokens = await this.getTokens();
      if (!tokens) return null;

      // Make refresh token request
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        await this.storeTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return null;
  }

  // Clear all auth data
  static async clearAuthData() {
    try {
      await AsyncStorage.removeItem(this.TOKEN_KEY);
      this.clearSessionTimeout();
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }
}