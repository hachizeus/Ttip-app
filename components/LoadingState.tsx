import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../lib/theme-context'
import { fonts, fontWeights } from '../lib/fonts'

interface LoadingStateProps {
  message?: string
  size?: 'small' | 'large'
}

export default function LoadingState({ message = 'Loading...', size = 'large' }: LoadingStateProps) {
  const { colors } = useTheme()
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: fontWeights.regular,
    marginTop: 16,
    textAlign: 'center',
  },
})