import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineStorage } from './offline-storage';

interface BackupData {
  userData: any;
  tips: any[];
  settings: any;
  timestamp: number;
  version: string;
}

export class BackupRestore {
  private static readonly BACKUP_KEY = 'ttip_backup';
  private static readonly VERSION = '1.0.0';

  static async createBackup(): Promise<string> {
    try {
      const userData = await OfflineStorage.getUserData();
      const tips = await OfflineStorage.getOfflineTips();
      const settings = await AsyncStorage.getItem('app_settings');

      const backup: BackupData = {
        userData: userData || {},
        tips: tips || [],
        settings: settings ? JSON.parse(settings) : {},
        timestamp: Date.now(),
        version: this.VERSION
      };

      const backupString = JSON.stringify(backup);
      await AsyncStorage.setItem(this.BACKUP_KEY, backupString);
      
      return backupString;
    } catch (error) {
      console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup');
    }
  }

  static async restoreFromBackup(backupString: string): Promise<boolean> {
    try {
      const backup: BackupData = JSON.parse(backupString);
      
      // Validate backup
      if (!backup.version || !backup.timestamp) {
        throw new Error('Invalid backup format');
      }

      // Restore data
      if (backup.userData) {
        await OfflineStorage.storeUserData(backup.userData);
      }

      if (backup.tips && backup.tips.length > 0) {
        await OfflineStorage.storeTipsOffline(backup.tips);
      }

      if (backup.settings) {
        await AsyncStorage.setItem('app_settings', JSON.stringify(backup.settings));
      }

      return true;
    } catch (error) {
      console.error('Backup restore failed:', error);
      return false;
    }
  }

  static async getBackupInfo(): Promise<{ timestamp: number; version: string } | null> {
    try {
      const backupString = await AsyncStorage.getItem(this.BACKUP_KEY);
      if (backupString) {
        const backup: BackupData = JSON.parse(backupString);
        return {
          timestamp: backup.timestamp,
          version: backup.version
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get backup info:', error);
      return null;
    }
  }

  static async deleteBackup(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.BACKUP_KEY);
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  }
}