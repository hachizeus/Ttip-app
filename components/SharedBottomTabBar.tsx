import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import HomeIcon from './icons/HomeIcon';
import LeaderboardIcon from './icons/LeaderboardIcon';
import { HapticTab } from './HapticTab';
import TabBarBackground from './ui/TabBarBackground';

export default function SharedBottomTabBar() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0052CC',
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
            <HomeIcon 
              size={focused ? 26 : 24} 
              color={focused ? '#0052CC' : '#999ca0'} 
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <LeaderboardIcon 
              size={focused ? 26 : 24} 
              color={focused ? '#FF6B00' : '#999ca0'} 
              focused={focused}
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
              name="person-outline" 
              size={focused ? 26 : 24} 
              color={focused ? '#0052CC' : '#999ca0'} 
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