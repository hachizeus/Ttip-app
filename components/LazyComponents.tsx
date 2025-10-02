import React, { Suspense } from 'react';
import { View } from 'react-native';
import LoadingDots from './LoadingDots';

// Lazy load heavy components
export const LazyAnalytics = React.lazy(() => import('../app/analytics'));
export const LazySubscription = React.lazy(() => import('../app/subscription'));
export const LazyQRCode = React.lazy(() => import('../app/qr-code'));
export const LazyWidgetSetup = React.lazy(() => import('../app/widget-setup'));

// Lazy wrapper component
export const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LoadingDots size={12} />
    </View>
  }>
    {children}
  </Suspense>
);