import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
}

export class Analytics {
  private static events: AnalyticsEvent[] = [];
  private static userId: string | null = null;

  static async init(userId?: string) {
    this.userId = userId || null;
    await this.loadStoredEvents();
  }

  static async track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now(),
      userId: this.userId || undefined
    };

    this.events.push(analyticsEvent);
    await this.storeEvents();

    // Send to analytics service when online
    this.sendEvents();
  }

  private static async loadStoredEvents() {
    try {
      const stored = await AsyncStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load analytics events:', error);
    }
  }

  private static async storeEvents() {
    try {
      await AsyncStorage.setItem('analytics_events', JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to store analytics events:', error);
    }
  }

  private static async sendEvents() {
    if (this.events.length === 0) return;

    try {
      // Send to analytics service (replace with actual service)
      console.log('Analytics events:', this.events);
      
      // Clear sent events
      this.events = [];
      await AsyncStorage.removeItem('analytics_events');
    } catch (error) {
      console.error('Failed to send analytics events:', error);
    }
  }

  // Common tracking methods
  static trackScreenView(screenName: string) {
    this.track('screen_view', { screen_name: screenName });
  }

  static trackPayment(amount: number, status: string) {
    this.track('payment', { amount, status });
  }

  static trackQRScan(workerID: string) {
    this.track('qr_scan', { worker_id: workerID });
  }

  static trackSubscription(plan: string, amount: number) {
    this.track('subscription', { plan, amount });
  }
}