import React from 'react'
import { View, StyleSheet } from 'react-native'

export function WorkerCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.name} />
        <View style={styles.occupation} />
        <View style={styles.amount} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    height: 16,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
    borderRadius: 4,
  },
  occupation: {
    height: 12,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
    borderRadius: 4,
    width: '70%',
  },
  amount: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '50%',
  },
})