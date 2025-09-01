import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase, Worker } from '../lib/supabase'
import { generateWorkerID, generateQRData } from '../lib/mpesa'
import { router } from 'expo-router'
import { formatPhoneForAPI, validateKenyanPhone } from '../lib/phone-utils'
import { useTheme, ThemeProvider } from '../lib/theme-context'

function SignupContent() {
  const { colors } = useTheme()
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!name || !gender || !occupation || !phone) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }

    if (!validateKenyanPhone(phone)) {
      Alert.alert('Error', 'Enter valid phone number (0712345678)')
      return
    }

    setLoading(true)
    try {
      const workerID = generateWorkerID()
      const apiPhone = formatPhoneForAPI(phone)
      const qrData = generateQRData(workerID)
      
      const trialExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      
      const { error } = await supabase
        .from('workers')
        .insert({
          name,
          gender,
          occupation,
          phone: apiPhone,
          worker_id: workerID,
          qr_code: qrData,
          subscription_plan: 'free', // Start with free plan
          subscription_expiry: trialExpiry.toISOString(),
          total_tips: 0,
          tip_count: 0
        })

      if (error) throw error

      // Save auth state
      await AsyncStorage.setItem('userPhone', apiPhone)
      await AsyncStorage.setItem('isLoggedIn', 'true')
      await AsyncStorage.setItem('userName', name)
      
      // Biometric auth disabled for Expo Go
      // const { storeSessionToken } = await import('../lib/biometric-auth')
      // const sessionToken = `${apiPhone}_${Date.now()}`
      // await storeSessionToken(sessionToken)
      
      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => {
          router.dismissAll()
          router.replace('/(tabs)')
        }}
      ])
    } catch (error) {
      Alert.alert('Error', 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>Worker Registration</Text>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        placeholder="Full Name"
        placeholderTextColor={colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      
      <View style={styles.genderContainer}>
        <TouchableOpacity
          style={[styles.genderButton, { backgroundColor: colors.card, borderColor: colors.border }, gender === 'Male' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setGender('Male')}
        >
          <Text style={[styles.genderText, { color: gender === 'Male' ? '#fff' : colors.text }]}>Male</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.genderButton, { backgroundColor: colors.card, borderColor: colors.border }, gender === 'Female' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          onPress={() => setGender('Female')}
        >
          <Text style={[styles.genderText, { color: gender === 'Female' ? '#fff' : colors.text }]}>Female</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        placeholder="Occupation"
        placeholderTextColor={colors.textSecondary}
        value={occupation}
        onChangeText={setOccupation}
      />
      
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
        placeholder="Phone Number (0712345678)"
        placeholderTextColor={colors.textSecondary}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
    fontSize: 14,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  genderButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})

export default function SignupScreen() {
  return (
    <ThemeProvider>
      <SignupContent />
    </ThemeProvider>
  )
}