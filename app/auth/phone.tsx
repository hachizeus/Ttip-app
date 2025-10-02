import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { sendOTP } from '../../lib/auth'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    if (phone.length !== 10 || !phone.startsWith('0')) {
      Alert.alert('Error', 'Enter valid phone number (0712345678)')
      return
    }

    setLoading(true)
    try {
      await sendOTP(phone)
      router.push({ pathname: '/auth/otp', params: { phone } })
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Phone Number</Text>
      <Text style={styles.subtitle}>We'll send you a verification code</Text>
      
      <TextInput
        style={styles.input}
        placeholder="0712345678"
        value={phone}
        onChangeText={setPhone}
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Send OTP'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 100,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    fontSize: 18,
    marginBottom: 30,
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
})