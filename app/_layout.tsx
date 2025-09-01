import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import LoadingScreen from '../components/LoadingScreen';
import { ThemeProvider } from '../lib/theme-context';
import { isLoggedIn } from '../lib/auth';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    
    // Check user status when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        isLoggedIn() // This will auto-logout if user was deleted
      }
    }
    
    const subscription = AppState.addEventListener('change', handleAppStateChange)
    
    return () => {
      clearTimeout(timer)
      subscription?.remove()
    }
  }, [])

  if (isLoading) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 150,
          gestureEnabled: true,
          presentation: 'transparentModal',
        }}
      />
    </ThemeProvider>
  );
}