import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeProvider } from '../lib/theme-context'

const { width, height } = Dimensions.get('window')

function WelcomeContent() {
  const { colors } = useTheme()

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGradient} />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="attach-money" size={60} color="#fff" />
          </View>
          <Text style={styles.brandName}>TTip</Text>
          <Text style={styles.tagline}>Digital Tipping Platform</Text>
        </View>
        
        <View style={styles.features}>
          <View style={styles.feature}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#007AFF" />
            <Text style={styles.featureText}>Scan & Tip Instantly</Text>
          </View>
          <View style={styles.feature}>
            <MaterialIcons name="security" size={24} color="#007AFF" />
            <Text style={styles.featureText}>Secure Payments</Text>
          </View>
          <View style={styles.feature}>
            <MaterialIcons name="trending-up" size={24} color="#007AFF" />
            <Text style={styles.featureText}>Track Earnings</Text>
          </View>
        </View>
        
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/signin')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function WelcomeScreen() {
  return (
    <ThemeProvider>
      <WelcomeContent />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brandName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  features: {
    paddingHorizontal: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 16,
    fontWeight: '500',
  },
  buttons: {
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#333',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})