import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { sendOTP } from '../../lib/auth'
import { validateKenyanPhone } from '../../lib/phone-utils'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\D/g, '') // Remove non-digits
    
    // Validate using the utility function
    if (!validateKenyanPhone(phone)) {
      Alert.alert('Error', 'Enter valid phone number (e.g., 712345678 or 0712345678)')
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
      <Text style={styles.subtitle}>Enter your 10-digit phone number (without country code)</Text>
      
      <TextInput
        style={styles.input}
        placeholder="712345678"
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