import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { useTheme } from '../lib/theme-context'

export default function LoadingScreen() {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.logoText}>T</Text>
      </View>
      <Text style={[styles.appName, { color: colors.text }]}>TTip</Text>
      <View style={[styles.loadingBar, { backgroundColor: colors.border }]}>
        <View style={[styles.loadingProgress, { backgroundColor: colors.primary }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  loadingBar: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    width: '60%',
    borderRadius: 2,
  },
})