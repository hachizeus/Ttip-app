import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router, usePathname } from 'expo-router'
import { useTheme } from '../lib/theme-context'

export default function BottomNavigation() {
  const { colors } = useTheme()
  const pathname = usePathname()

  const tabs = [
    { name: 'Home', icon: 'home', route: '/(tabs)' },
    { name: 'Scanner', icon: 'qr-code-scanner', route: '/(tabs)/explore' },
    { name: 'Leaderboard', icon: 'leaderboard', route: '/(tabs)/leaderboard' },
    { name: 'Profile', icon: 'person', route: '/(tabs)/profile' }
  ]

  const isActive = (route: string) => {
    if (route === '/(tabs)' && pathname === '/') return true
    return pathname.includes(route.replace('/(tabs)', ''))
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tab}
          onPress={() => router.push(tab.route as any)}
        >
          <MaterialIcons
            name={tab.icon as any}
            size={24}
            color={isActive(tab.route) ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      ))}
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
    paddingVertical: 12,
    paddingBottom: 20,
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
    paddingVertical: 8,
  },
})