import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { isLoggedIn, getCurrentUser } from '../../lib/auth';
import { shouldShowGraceScreen } from '../../lib/subscription-utils';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '../../lib/theme-context';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';

function TabsContent() {
  const { colors } = useTheme()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Add delay to prevent race condition with login
    await new Promise(resolve => setTimeout(resolve, 500))
    const loggedIn = await isLoggedIn()
    if (!loggedIn) {
      router.replace('/welcome')
      return
    }
    
    // Check subscription status
    const phone = await getCurrentUser()
    if (phone) {
      const showGrace = await shouldShowGraceScreen(phone)
      if (showGrace) {
        router.replace('/grace-screen')
      }
    }
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00C851',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 100,
          paddingBottom: 40,
          paddingTop: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name="home" 
              size={focused ? 32 : 28} 
              color={focused ? '#00C851' : '#666'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name="bar-chart" 
              size={focused ? 32 : 28} 
              color={focused ? '#00C851' : '#666'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <MaterialIcons 
              name="person" 
              size={focused ? 32 : 28} 
              color={focused ? '#00C851' : '#666'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <TabsContent />
    </ThemeProvider>
  )
}
