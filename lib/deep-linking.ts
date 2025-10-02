import * as Linking from 'expo-linking';
import { router } from 'expo-router';

export class DeepLinking {
  static init() {
    // Handle initial URL when app is opened from link
    Linking.getInitialURL().then((url) => {
      if (url) {
        this.handleDeepLink(url);
      }
    });

    // Handle URLs when app is already running
    Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });
  }

  static handleDeepLink(url: string) {
    try {
      const parsed = Linking.parse(url);
      
      if (parsed.hostname === 'tip' || parsed.path?.includes('/tip/')) {
        // Handle tip URLs: ttip://tip/workerID or https://domain.com/tip/workerID
        const workerID = parsed.path?.split('/').pop() || parsed.queryParams?.worker;
        if (workerID) {
          router.push(`/tip/${workerID}`);
        }
      } else if (parsed.hostname === 'offline-tip') {
        // Handle offline tip URLs: ttip://offline-tip/workerID
        const workerID = parsed.path?.split('/').pop();
        if (workerID) {
          router.push(`/tip/${workerID}`);
        }
      }
    } catch (error) {
      console.error('Deep link parsing error:', error);
    }
  }

  static createTipLink(workerID: string): string {
    return Linking.createURL(`/tip/${workerID}`);
  }
}