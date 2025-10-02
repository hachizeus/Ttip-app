import AsyncStorage from '@react-native-async-storage/async-storage';
// Simple base64 encoding for basic data protection
const encrypt = (data: string): string => {
  return btoa(data);
};

// Simple base64 decoding
const decrypt = (encryptedData: string): string => {
  return atob(encryptedData);
};

// Offline storage manager
export class OfflineStorage {
  // Store user data offline
  static async storeUserData(userData: any) {
    try {
      const encrypted = encrypt(JSON.stringify(userData));
      await AsyncStorage.setItem('offline_user_data', encrypted);
    } catch (error) {
      console.error('Failed to store user data offline:', error);
    }
  }

  // Get offline user data
  static async getUserData() {
    try {
      const encrypted = await AsyncStorage.getItem('offline_user_data');
      if (encrypted) {
        const decrypted = decrypt(encrypted);
        return JSON.parse(decrypted);
      }
      return null;
    } catch (error) {
      console.error('Failed to get offline user data:', error);
      return null;
    }
  }

  // Store tips offline
  static async storeTipsOffline(tips: any[]) {
    try {
      const encrypted = encrypt(JSON.stringify(tips));
      await AsyncStorage.setItem('offline_tips', encrypted);
    } catch (error) {
      console.error('Failed to store tips offline:', error);
    }
  }

  // Get offline tips
  static async getOfflineTips() {
    try {
      const encrypted = await AsyncStorage.getItem('offline_tips');
      if (encrypted) {
        const decrypted = decrypt(encrypted);
        return JSON.parse(decrypted);
      }
      return [];
    } catch (error) {
      console.error('Failed to get offline tips:', error);
      return [];
    }
  }

  // Store pending sync operations
  static async storePendingSync(operation: any) {
    try {
      const existing = await AsyncStorage.getItem('pending_sync');
      const operations = existing ? JSON.parse(existing) : [];
      operations.push({ ...operation, timestamp: Date.now() });
      await AsyncStorage.setItem('pending_sync', JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to store pending sync:', error);
    }
  }

  // Get pending sync operations
  static async getPendingSync() {
    try {
      const data = await AsyncStorage.getItem('pending_sync');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending sync:', error);
      return [];
    }
  }

  // Clear pending sync after successful upload
  static async clearPendingSync() {
    try {
      await AsyncStorage.removeItem('pending_sync');
    } catch (error) {
      console.error('Failed to clear pending sync:', error);
    }
  }

  // Store offline payment queue
  static async queueOfflinePayment(payment: any) {
    try {
      const existing = await AsyncStorage.getItem('offline_payments');
      const payments = existing ? JSON.parse(existing) : [];
      payments.push({ ...payment, timestamp: Date.now(), status: 'pending' });
      await AsyncStorage.setItem('offline_payments', JSON.stringify(payments));
    } catch (error) {
      console.error('Failed to queue offline payment:', error);
    }
  }

  // Get offline payment queue
  static async getOfflinePayments() {
    try {
      const data = await AsyncStorage.getItem('offline_payments');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline payments:', error);
      return [];
    }
  }

  // Store worker data for offline access
  static async storeWorkerData(workerId: string, workerData: any) {
    try {
      const encrypted = encrypt(JSON.stringify(workerData));
      await AsyncStorage.setItem(`worker_${workerId}`, encrypted);
    } catch (error) {
      console.error('Failed to store worker data:', error);
    }
  }

  // Get worker data offline
  static async getWorkerData(workerId: string) {
    try {
      const encrypted = await AsyncStorage.getItem(`worker_${workerId}`);
      if (encrypted) {
        const decrypted = decrypt(encrypted);
        return JSON.parse(decrypted);
      }
      return null;
    } catch (error) {
      console.error('Failed to get worker data:', error);
      return null;
    }
  }

  // Process offline payments when back online
  static async processOfflinePayments() {
    try {
      const payments = await this.getOfflinePayments();
      const processed = [];
      
      for (const payment of payments) {
        if (payment.status === 'pending') {
          // Mark as processed (actual payment processing would happen here)
          processed.push({ ...payment, status: 'processed', processedAt: Date.now() });
        }
      }
      
      await AsyncStorage.setItem('offline_payments', JSON.stringify(processed));
      return processed;
    } catch (error) {
      console.error('Failed to process offline payments:', error);
      return [];
    }
  }
}