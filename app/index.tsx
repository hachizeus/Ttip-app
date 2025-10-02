import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect } from 'react';
import { router } from 'expo-router';
import { isLoggedIn } from '../lib/auth';

export default function Index() {
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // Clear session flag on app start
      await AsyncStorage.removeItem('graceScreenDismissed')
      
      const loggedIn = await isLoggedIn();
      
      if (loggedIn) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    };

    checkAuthAndRedirect();
  }, []);

  return null;
}