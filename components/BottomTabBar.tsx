import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { router, usePathname } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../lib/theme-context'
import HomeIcon from './icons/HomeIcon'
import LeaderboardIcon from './icons/LeaderboardIcon'

export default function BottomTabBar() {
  const { colors } = useTheme()
  const pathname = usePathname()

  const isActive = (route: string) => {
    if (route === '/(tabs)' && (pathname === '/' || pathname === '/(tabs)')) return true
    if (route === '/(tabs)/leaderboard' && pathname.includes('leaderboard')) return true
    if (route === '/(tabs)/profile' && pathname.includes('profile')) return true
    return false
  }

  const tabs = [
    {
      route: '/(tabs)',
      icon: (focused: boolean) => (
        <HomeIcon 
          size={focused ? 26 : 24} 
          color={focused ? '#0052CC' : '#999ca0'} 
          focused={focused}
        />
      )
    },
    {
      route: '/(tabs)/leaderboard',
      icon: (focused: boolean) => (
        <LeaderboardIcon 
          size={focused ? 26 : 24} 
          color={focused ? '#FF6B00' : '#999ca0'} 
          focused={focused}
        />
      )
    },
    {
      route: '/(tabs)/profile',
      icon: (focused: boolean) => (
        <MaterialIcons 
          name="person-outline" 
          size={focused ? 26 : 24} 
          color={focused ? '#0052CC' : '#999ca0'} 
        />
      )
    }
  ]

  const handlePress = (route: string) => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    // Use push for smoother tab navigation
    router.push(route as any)
  }

  return (
    <View style={[styles.container, { 
      backgroundColor: colors.background,
      borderTopColor: colors.border 
    }]}>
      {tabs.map((tab, index) => {
        const focused = isActive(tab.route)
        return (
          <TouchableOpacity
            key={index}
            style={styles.tab}
            onPress={() => handlePress(tab.route)}
            activeOpacity={0.7}
          >
            {tab.icon(focused)}
          </TouchableOpacity>
        )
      })}
    </View>
  )
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})