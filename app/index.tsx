import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { isLoggedIn } from '../lib/auth'

export default function SplashScreen() {
  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  const checkAuthAndRedirect = async () => {
    // Show splash for 2 seconds
    setTimeout(async () => {
      const loggedIn = await isLoggedIn()
      if (loggedIn) {
        router.replace('/(tabs)')
      } else {
        router.replace('/welcome')
      }
    }, 2000)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💰</Text>
      <Text style={styles.title}>TTip</Text>
      <Text style={styles.subtitle}>Digital Tipping Made Easy</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
})