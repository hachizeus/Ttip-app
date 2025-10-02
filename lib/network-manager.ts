// import NetInfo from '@react-native-community/netinfo';
import { OfflineStorage } from './offline-storage';

export class NetworkManager {
  private static isOnline = true;
  private static listeners: ((isOnline: boolean) => void)[] = [];

  // Initialize network monitoring (simplified for offline-first)
  static init() {
    // Check initial connectivity
    this.checkConnectivity();
    
    // Periodically check connectivity by attempting a simple fetch
    setInterval(() => {
      this.checkConnectivity();
    }, 30000); // Check every 30 seconds
  }

  // Simple connectivity check
  private static async checkConnectivity() {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        timeout: 5000
      });
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      if (!wasOnline && this.isOnline) {
        // Back online - sync pending data
        this.syncPendingData();
      }
      
      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));
    } catch (error) {
      this.isOnline = false;
      this.listeners.forEach(listener => listener(false));
    }
  }

  // Check if online
  static getIsOnline(): boolean {
    return this.isOnline;
  }

  // Add network status listener
  static addListener(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Sync pending data when back online
  private static async syncPendingData() {
    try {
      const pendingOperations = await OfflineStorage.getPendingSync();
      
      for (const operation of pendingOperations) {
        try {
          // Process each pending operation
          await this.processPendingOperation(operation);
        } catch (error) {
          console.error('Failed to sync operation:', error);
        }
      }
      
      // Clear synced operations
      await OfflineStorage.clearPendingSync();
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    }
  }

  // Process individual pending operation
  private static async processPendingOperation(operation: any) {
    // Implementation depends on operation type
    switch (operation.type) {
      case 'tip_update':
        // Sync tip data
        break;
      case 'profile_update':
        // Sync profile data
        break;
      case 'offline_payment':
        // Process offline payment
        await OfflineStorage.processOfflinePayments();
        break;
      default:
        console.warn('Unknown operation type:', operation.type);
    }
  }

  // Handle offline QR scan
  static handleOfflineQRScan(workerId: string) {
    return `ttip://offline-tip/${workerId}?timestamp=${Date.now()}`;
  }

  // Queue offline payment
  static async queueOfflinePayment(paymentData: any) {
    await OfflineStorage.queueOfflinePayment(paymentData);
    await OfflineStorage.storePendingSync({
      type: 'offline_payment',
      data: paymentData
    });
  }

  // Make network request with offline fallback
  static async makeRequest<T>(
    requestFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    if (!this.isOnline && fallbackFn) {
      return fallbackFn();
    }
    
    try {
      return await requestFn();
    } catch (error) {
      if (!this.isOnline && fallbackFn) {
        return fallbackFn();
      }
      throw error;
    }
  }
}