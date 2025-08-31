import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { sendOTP } from '../../lib/auth'
import { formatPhoneForAPI, validateKenyanPhone } from '../../lib/phone-utils'
import { supabase } from '../../lib/supabase'

export default function PhoneScreen() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async () => {
    if (!validateKenyanPhone(phone)) {
      Alert.alert('Error', 'Enter valid phone number (0712345678)')
      return
    }

    setLoading(true)
    try {
      const apiPhone = formatPhoneForAPI(phone)
      await sendOTP(apiPhone)
      router.push({ pathname: '/auth/otp', params: { phone: apiPhone } })
    } catch (error) {
      Alert.alert('Error', 'Failed to send OTP. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Enter Phone Number</Text>
      <Text style={styles.subtitle}>We'll send you a verification code</Text>
      
      <TextInput
        style={styles.input}
        placeholder="0712345678"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
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
    borderRadius: 8,
    fontSize: 18,
    textAlign: 'center',
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