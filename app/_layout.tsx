import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { AppState, Image, Text, View, useColorScheme } from 'react-native';
const welcomeImages = [
  require('../assets/images/woman-service.jpg'),
  require('../assets/images/bartender-working-club.jpg'),
  require('../assets/images/man-truck.jpg'),
  require('../assets/images/harvest.jpg'),
  require('../assets/images/woman-service.jpg'),
];


import { ThemeProvider } from '../lib/theme-context';
// import { OptimizedThemeProvider } from '../lib/optimized-theme';
import GlobalBottomNav from '../components/GlobalBottomNav';
import { LoadingProvider } from '../components/GlobalLoading';
import { isLoggedIn } from '../lib/auth';
import { DeepLinking } from '../lib/deep-linking';
import { ErrorBoundary } from '../lib/error-boundary';
import { NetworkManager } from '../lib/network-manager';
import { NotificationProvider } from '../lib/notification-context';
// import { PushNotifications } from '../lib/push-notifications';
import { Analytics } from '../lib/analytics';
import { PerformanceMonitor } from '../lib/performance-monitor';
import BackgroundSync from '../lib/background-sync';


export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initApp = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        setTimeout(async () => {
          try {
            await SplashScreen.hideAsync();
          } catch (error) {
            // Ignore splash screen errors
          }
        }, 100);
      } catch (error) {
        // Ignore if splash screen is not available
      }
    };
    
    initApp();

    // Initialize all production services
    NetworkManager.init();
    DeepLinking.init();
    Analytics.init();
    PerformanceMonitor.trackMemoryUsage();
    
    // Initialize background sync for offline tips
    const backgroundSync = BackgroundSync.getInstance();
    
    // Force check for pending tips after a delay
    setTimeout(() => {
      backgroundSync.checkPendingTipsOnStartup();
    }, 3000);

    // Check user status when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        isLoggedIn();
        PerformanceMonitor.trackMemoryUsage();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, []);



  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <LoadingProvider>
            <View style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade_from_bottom',
                  animationDuration: 150,
                  gestureEnabled: true,
                  presentation: 'transparentModal',
                }}
              />
              <GlobalBottomNav />
            </View>
          </LoadingProvider>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}