import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface SuccessAnimationProps {
  message?: string
}

export default function SuccessAnimation({ 
  message = 'Success!' 
}: SuccessAnimationProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="check-circle" size={64} color="#00C851" />
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  message: {
    fontSize: 16,
    color: '#00C851',
    marginTop: 12,
    fontWeight: '600',
  },
})