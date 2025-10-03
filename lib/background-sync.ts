import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert, AppState } from 'react-native';

class BackgroundSync {
  private static instance: BackgroundSync;
  private isOnline = false;
  private syncing = false;

  static getInstance(): BackgroundSync {
    if (!BackgroundSync.instance) {
      BackgroundSync.instance = new BackgroundSync();
    }
    return BackgroundSync.instance;
  }

  constructor() {
    this.initNetworkListener();
    this.initAppStateListener();
    // Check for pending tips on startup with delay
    setTimeout(() => this.checkPendingTipsOnStartup(), 2000);
  }

  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log('📡 Network changed:', this.isOnline ? 'ONLINE' : 'OFFLINE');
      
      if (wasOffline && this.isOnline) {
        console.log('🔄 Back online - checking for pending tips');
        this.syncPendingTips();
      }
    });
  }

  private async syncPendingTips() {
    if (this.syncing) return;
    
    // Double-check network status
    const currentState = await NetInfo.fetch();
    const actuallyOnline = currentState.isConnected ?? false;
    
    if (!actuallyOnline) {
      console.log('📱 Still offline - skipping sync');
      return;
    }
    
    try {
      const pending = JSON.parse(await AsyncStorage.getItem('pendingTips') || '[]');
      const queuedTips = pending.filter((tip: any) => tip.status === 'queued');
      
      if (queuedTips.length === 0) {
        console.log('📱 No pending tips to sync');
        return;
      }

      this.syncing = true;
      
      // Show back online notification
      Alert.alert(
        '📶 Back Online!', 
        `Processing ${queuedTips.length} queued tip${queuedTips.length > 1 ? 's' : ''}...`,
        [{ text: 'OK' }]
      );

      for (const tip of queuedTips) {
        try {
          console.log(`🔄 Processing tip: ${tip.amount} KSh for ${tip.workerId}`);
          
          const response = await fetch('https://ttip-app.onrender.com/api/stk-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workerId: tip.workerId,
              amount: tip.amount,
              customerPhone: tip.customerPhone
            })
          });

          const result = await response.json();
          
          if (result.success) {
            console.log(`✅ Tip processed successfully: ${tip.id}`);
            
            // Remove from pending - get fresh data to avoid race conditions
            const freshPending = JSON.parse(await AsyncStorage.getItem('pendingTips') || '[]');
            const updated = freshPending.filter((p: any) => p.id !== tip.id);
            await AsyncStorage.setItem('pendingTips', JSON.stringify(updated));
            
            // Show STK push notification
            Alert.alert(
              '💰 Payment Initiated', 
              `STK push sent for KSh ${tip.amount}! Check your phone.`,
              [{ text: 'OK' }]
            );
          } else {
            console.log(`❌ Tip failed: ${tip.id} - ${result.error}`);
          }
        } catch (error) {
          console.log(`❌ Network error for tip ${tip.id}:`, error);
        }
      }
    } catch (error) {
      console.log('❌ Sync error:', error);
    } finally {
      this.syncing = false;
    }
  }

  private initAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active - checking for pending tips');
        setTimeout(() => this.checkPendingTipsOnStartup(), 2000);
      }
    });
  }

  async checkPendingTipsOnStartup() {
    try {
      const currentState = await NetInfo.fetch();
      const actuallyOnline = currentState.isConnected ?? false;
      
      console.log('🔄 App startup - Network status:', actuallyOnline);
      
      if (actuallyOnline) {
        const pendingData = await AsyncStorage.getItem('pendingTips');
        console.log('📱 Raw pending data:', pendingData);
        
        const pending = JSON.parse(pendingData || '[]');
        console.log('📱 Parsed pending tips:', pending);
        
        const queuedTips = pending.filter((tip: any) => tip.status === 'queued');
        console.log('📱 Queued tips:', queuedTips);
        
        if (queuedTips.length > 0) {
          console.log(`🔄 Found ${queuedTips.length} pending tips on startup`);
          this.syncPendingTips();
        } else {
          console.log('✅ No pending tips found on startup');
        }
      }
    } catch (error) {
      console.log('❌ Error checking pending tips on startup:', error);
    }
  }
}

export default BackgroundSync;