import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface EmptyStateProps {
  icon?: string
  title: string
  message: string
}

export default function EmptyState({ 
  icon = 'inbox', 
  title, 
  message 
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name={icon as any} size={64} color="#ccc" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
})