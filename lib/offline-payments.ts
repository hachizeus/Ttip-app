import { OfflineStorage } from './offline-storage';

export interface OfflinePayment {
  id: string;
  type: 'tip' | 'subscription';
  amount: number;
  phone: string;
  workerID?: string;
  subscriptionPlan?: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export class OfflinePayments {
  // Store payment for later processing
  static async storePendingPayment(payment: Omit<OfflinePayment, 'id' | 'timestamp' | 'status'>) {
    const offlinePayment: OfflinePayment = {
      ...payment,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending'
    };

    await OfflineStorage.storePendingSync({
      type: 'payment',
      data: offlinePayment
    });

    return offlinePayment;
  }

  // Get all pending payments
  static async getPendingPayments(): Promise<OfflinePayment[]> {
    const pendingSync = await OfflineStorage.getPendingSync();
    return pendingSync
      .filter(item => item.type === 'payment')
      .map(item => item.data);
  }

  // Process tip payment offline
  static async processTipOffline(phone: string, amount: number, workerID: string) {
    // Store payment locally
    const payment = await this.storePendingPayment({
      type: 'tip',
      amount,
      phone,
      workerID
    });

    // Update local tip data immediately for better UX
    const offlineTips = await OfflineStorage.getOfflineTips();
    const newTip = {
      id: payment.id,
      worker_id: workerID,
      amount,
      customer_phone: phone,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    offlineTips.push(newTip);
    await OfflineStorage.storeTipsOffline(offlineTips);

    return {
      success: true,
      message: 'Payment queued for processing when online',
      paymentId: payment.id
    };
  }

  // Process subscription payment offline
  static async processSubscriptionOffline(phone: string, amount: number, plan: string) {
    const payment = await this.storePendingPayment({
      type: 'subscription',
      amount,
      phone,
      subscriptionPlan: plan
    });

    // Update local subscription status
    const userData = await OfflineStorage.getUserData() || {};
    userData.pendingSubscription = {
      plan,
      amount,
      paymentId: payment.id,
      timestamp: Date.now()
    };
    await OfflineStorage.storeUserData(userData);

    return {
      success: true,
      message: 'Subscription queued for processing when online',
      paymentId: payment.id
    };
  }

  // Generate offline QR code data
  static generateOfflineQRData(workerID: string) {
    return {
      workerID,
      offline: true,
      timestamp: Date.now(),
      url: `ttip://offline-tip/${workerID}`
    };
  }

  // Simulate M-Pesa response for offline mode
  static simulateOfflinePaymentResponse() {
    return {
      MerchantRequestID: `offline_${Date.now()}`,
      CheckoutRequestID: `offline_co_${Date.now()}`,
      ResponseCode: "0",
      ResponseDescription: "Payment queued for processing when online",
      CustomerMessage: "Payment will be processed when internet connection is restored"
    };
  }
}