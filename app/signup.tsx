import { MaterialIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { fonts } from '../lib/fonts'
import { generateQRData, generateWorkerID } from '../lib/mpesa'
import { formatPhoneForAPI, validateKenyanPhone } from '../lib/phone-utils'
import { supabase } from '../lib/supabase'
import { ThemeProvider, useTheme } from '../lib/theme-context'

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      {/* Header with Back Arrow */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Image source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }} style={styles.logo} />
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]} >Create Your Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} >Join TTip and start receiving digital tips</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          placeholder="Full Name"
          placeholderTextColor={colors.textSecondary}
          value={name}
          onChangeText={setName}
        />
        <View style={styles.genderContainer}>
          <TouchableOpacity
            style={[styles.genderButton, { backgroundColor: colors.card, borderColor: colors.border }, gender === 'Male' ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
            onPress={() => setGender('Male')}
          >
            <Text style={[styles.genderText, { color: gender === 'Male' ? '#fff' : colors.text }]}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, { backgroundColor: colors.card, borderColor: colors.border }, gender === 'Female' ? { backgroundColor: colors.primary, borderColor: colors.primary } : null]}
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
          style={[styles.button, { backgroundColor: colors.primary }, loading ? styles.buttonDisabled : null]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>
        <View style={styles.legalLinks}>
          <Text style={[styles.legalNotice, { color: colors.textSecondary }]}>By signing up, you agree to our{' '}</Text>
          <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
            <Text style={[styles.legalText, { color: colors.primary }]}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[styles.legalNotice, { color: colors.textSecondary }]}> and </Text>
          <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
            <Text style={[styles.legalText, { color: colors.primary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.developerCredit}>
          <Image source={{ uri: 'https://cpbonffjhrckiiqbsopt.supabase.co/storage/v1/object/public/banners/mylogo.png' }} style={styles.creditLogo} />
          <Text style={[styles.creditText, { color: colors.textSecondary }]}>Developed by ElitJohns Digital Services</Text>
        </View>
      </ScrollView>
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? <Text style={[styles.linkText, { color: colors.primary }]} onPress={() => router.push('/signin')}>Sign In</Text></Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  logo: {
    width: 100,
    height: 32,
    resizeMode: 'contain',
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 5,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: '400',
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 12,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fonts.bold,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    marginTop: -100,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontFamily: fonts.regular,
    fontWeight: '400',
  },
  linkText: {
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legalNotice: {
    fontSize: 12,
    textAlign: 'center',
  },
  legalText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  developerCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  creditLogo: {
    width: 30,
    height: 10,
    resizeMode: 'contain',
  },
  creditText: {
    fontSize: 11,
  },
})

export default function SignupScreen() {
  return (
    <ThemeProvider>
      <SignupContent />
    </ThemeProvider>
  )
}