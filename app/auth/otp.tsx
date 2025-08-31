import React, { useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Animated } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { verifyOTP } from '../../lib/auth'

export default function OTPScreen() {
  const { phone, userName } = useLocalSearchParams()
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const shakeAnimation = useRef(new Animated.Value(0)).current

  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start()
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      shakeInput()
      return
    }

    setLoading(true)
    try {
      const result = await verifyOTP(phone as string, otp, userName as string)
      if (result.success) {
        router.replace('/(tabs)')
      } else {
        setOtp('')
        shakeInput()
      }
    } catch (error) {
      setOtp('')
      shakeInput()
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Enter OTP</Text>
      
      <Animated.View style={{ transform: [{ translateX: shakeAnimation }] }}>
        <TextInput
          style={styles.input}
          placeholder="123456"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
          autoFocus
        />
      </Animated.View>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>Change Phone Number</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingTop: 100,
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    color: '#000',
    padding: 15,
    borderRadius: 8,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
  },
})