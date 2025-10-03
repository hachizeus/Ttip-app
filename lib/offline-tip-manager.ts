import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

export interface OfflineTip {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  customerPhone: string;
  timestamp: string;
  status: 'queued' | 'syncing' | 'completed' | 'failed';
}

class OfflineTipManager {
  private static instance: OfflineTipManager;
  private isOnline = true;
  private syncInProgress = false;

  static getInstance(): OfflineTipManager {
    if (!OfflineTipManager.instance) {
      OfflineTipManager.instance = new OfflineTipManager();
    }
    return OfflineTipManager.instance;
  }

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        this.syncPendingTips();
      }
    });
  }

  async queueTip(tip: Omit<OfflineTip, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const offlineTip: OfflineTip = {
      ...tip,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      status: 'queued'
    };

    const existing = await this.getPendingTips();
    const updated = [...existing, offlineTip];
    
    await AsyncStorage.setItem('pendingTips', JSON.stringify(updated));
    
    console.log('✅ Tip queued offline, will sync when online');
    
    return offlineTip.id;
  }

  async getPendingTips(): Promise<OfflineTip[]> {
    try {
      const stored = await AsyncStorage.getItem('pendingTips');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async syncPendingTips(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    const pending = await this.getPendingTips();
    const queuedTips = pending.filter(t => t.status === 'queued');
    
    if (queuedTips.length > 0) {
      // Show notification that payments are being processed
      const { Alert } = await import('react-native');
      Alert.alert('📶 Back Online!', `Processing ${queuedTips.length} queued tip${queuedTips.length > 1 ? 's' : ''}...`, [
        { text: 'OK' }
      ]);
    }
    
    for (const tip of queuedTips) {
      try {
        await this.updateTipStatus(tip.id, 'syncing');
        
        const response = await fetch('https://ttip-app.onrender.com/api/stk-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: tip.customerPhone,
            amount: tip.amount,
            workerId: tip.workerId
          })
        });

        const result = await response.json();
        
        if (result.success) {
          await this.removeTip(tip.id);
          // Show STK push notification
          Alert.alert('💰 Payment Initiated', `STK push sent for KSh ${tip.amount}! Check your phone.`, [
            { text: 'OK' }
          ]);
        } else {
          await this.updateTipStatus(tip.id, 'failed');
        }
      } catch (error) {
        await this.updateTipStatus(tip.id, 'failed');
      }
    }
    
    this.syncInProgress = false;
  }

  private async updateTipStatus(tipId: string, status: OfflineTip['status']): Promise<void> {
    const tips = await this.getPendingTips();
    const updated = tips.map(tip => 
      tip.id === tipId ? { ...tip, status } : tip
    );
    await AsyncStorage.setItem('pendingTips', JSON.stringify(updated));
  }

  private async removeTip(tipId: string): Promise<void> {
    const tips = await this.getPendingTips();
    const filtered = tips.filter(tip => tip.id !== tipId);
    await AsyncStorage.setItem('pendingTips', JSON.stringify(filtered));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  isNetworkAvailable(): boolean {
    return this.isOnline;
  }
}

export default OfflineTipManager;