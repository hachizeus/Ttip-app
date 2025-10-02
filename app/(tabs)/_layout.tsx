import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { isLoggedIn, getCurrentUser } from '../../lib/auth';
import { shouldShowGraceScreen } from '../../lib/subscription-utils';
import { useTheme } from '../../lib/theme-context';
import SharedBottomTabBar from '../../components/SharedBottomTabBar';

export default function TabLayout() {
  const { colors } = useTheme();
  const hasCheckedGrace = useRef(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      router.replace('/welcome');
      return;
    }
    
    // Check if grace screen was dismissed in this session
    const graceScreenDismissed = await AsyncStorage.getItem('graceScreenDismissed')
    
    // Only check grace screen if not dismissed and not checked before
    if (!hasCheckedGrace.current && graceScreenDismissed !== 'true') {
      const phone = await getCurrentUser();
      if (phone) {
        const showGrace = await shouldShowGraceScreen(phone);
        if (showGrace) {
          hasCheckedGrace.current = true;
          router.replace('/grace-screen');
          return;
        }
      }
      hasCheckedGrace.current = true;
    }
  };

  return <SharedBottomTabBar />;
}
