import { OfflineStorage } from './offline-storage';
import { NetworkManager } from './network-manager';

export class OfflinePayment {
  // Process payment offline
  static async processOfflinePayment(paymentData: {
    workerId: string;
    amount: number;
    phone: string;
    customerName?: string;
  }) {
    try {
      // Create offline payment record
      const offlinePayment = {
        id: `offline_${Date.now()}`,
        workerId: paymentData.workerId,
        amount: paymentData.amount,
        phone: paymentData.phone,
        customerName: paymentData.customerName || 'Anonymous',
        status: 'pending_online',
        createdAt: new Date().toISOString(),
        type: 'offline_payment'
      };

      // Queue payment for when online
      await NetworkManager.queueOfflinePayment(offlinePayment);

      // Store in offline tips for immediate display
      const existingTips = await OfflineStorage.getOfflineTips();
      existingTips.push({
        ...offlinePayment,
        status: 'completed', // Show as completed locally
        offline: true
      });
      await OfflineStorage.storeTipsOffline(existingTips);

      return {
        success: true,
        message: 'Payment queued for processing when online',
        paymentId: offlinePayment.id
      };
    } catch (error) {
      console.error('Offline payment failed:', error);
      return {
        success: false,
        message: 'Failed to process offline payment'
      };
    }
  }

  // Get offline payment status
  static async getOfflinePaymentStatus() {
    const payments = await OfflineStorage.getOfflinePayments();
    const pending = payments.filter(p => p.status === 'pending').length;
    const processed = payments.filter(p => p.status === 'processed').length;
    
    return {
      pending,
      processed,
      total: payments.length
    };
  }

  // Simulate M-Pesa STK push for offline mode
  static simulateOfflineSTKPush(phone: string, amount: number) {
    return {
      success: true,
      message: 'Payment will be processed when online',
      MerchantRequestID: `offline_${Date.now()}`,
      CheckoutRequestID: `offline_co_${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Queued for online processing',
      CustomerMessage: 'Payment queued. Will process when connected to internet.'
    };
  }
}