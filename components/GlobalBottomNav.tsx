import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useTheme } from '../lib/theme-context';
import { isLoggedIn } from '../lib/auth';
import HomeIcon from './icons/HomeIcon';
import LeaderboardIcon from './icons/LeaderboardIcon';

export default function GlobalBottomNav() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  
  useEffect(() => {
    checkLoginStatus();
  }, [pathname]);
  
  const checkLoginStatus = async () => {
    const isUserLoggedIn = await isLoggedIn();
    setLoggedIn(isUserLoggedIn);
  };
  
  // Hide on auth screens, welcome screens, splash, scanner, or when not logged in
  const hideOnPaths = ['/welcome', '/signin', '/signup', '/login', '/auth/phone', '/auth/otp', '/grace-screen', '/', '/scanner'];
  if (hideOnPaths.includes(pathname) || !loggedIn || pathname === '/') return null;

  const isActive = (path: string) => {
    if (path === '/(tabs)') return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => router.push('/')}
      >
        <HomeIcon 
          size={isActive('/(tabs)') || pathname === '/' ? 26 : 24} 
          color={isActive('/(tabs)') ? '#0052CC' : '#999ca0'} 
          focused={isActive('/(tabs)')}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => router.push('/leaderboard')}
      >
        <LeaderboardIcon 
          size={isActive('/(tabs)/leaderboard') ? 26 : 24} 
          color={isActive('/leaderboard') ? '#FF6B00' : '#999ca0'} 
          focused={isActive('/leaderboard')}
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.tab} 
        onPress={() => router.push('/profile')}
      >
        <MaterialIcons 
          name="person-outline" 
          size={isActive('/(tabs)/profile') ? 26 : 24} 
          color={isActive('/profile') ? '#0052CC' : '#999ca0'} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 100,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1000,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});