import { Stack } from 'expo-router';
import React, { useState, useEffect } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { ThemeProvider } from '../lib/theme-context';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        animationDuration: 150,
        gestureEnabled: true,
        presentation: 'transparentModal',
      }}
    />
  );
}