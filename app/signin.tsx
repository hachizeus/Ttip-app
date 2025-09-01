import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useState, useRef } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import FingerprintModal from '../components/FingerprintModal'
import { getBiometricInfo, loginWithBiometric, sendOTP, verifyOTP } from '../lib/auth'
import { formatPhoneForAPI, validateKenyanPhone } from '../lib/phone-utils'
import { supabase } from '../lib/supabase'
import { ThemeProvider } from '../lib/theme-context'
import { fonts, fontWeights } from '../lib/fonts'

function SignInContent() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [showBiometricModal, setShowBiometricModal] = useState(false)
  const [biometricType, setBiometricType] = useState('Biometric')
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    checkBiometricAvailability()
  }, [])

  useEffect(() => {
    // Auto-trigger fingerprint authentication when page loads
    if (biometricAvailable && step === 'phone') {
      handleBiometricLogin()
    }
  }, [biometricAvailable, step])

  useEffect(() => {
    if (otp.length === 4) {
      handleVerifyOTP()
    }
  }, [otp])



  const checkBiometricAvailability = async () => {
    try {
      const capability = await getBiometricInfo()
      if (capability.isAvailable) {
        setBiometricType(capability.biometricType)
        setBiometricAvailable(true)
      }
    } catch (error) {
      console.log('Biometric check failed:', error)
    }
  }

  const handleBiometricLogin = async () => {
    setBiometricLoading(true)
    try {
      const result = await loginWithBiometric()
      if (result.success) {
        router.dismissAll()
        router.replace('/(tabs)')
      }
    } catch (error) {
      console.log('Biometric login failed:', error)
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!validateKenyanPhone(phone)) {
      Alert.alert('Invalid Phone', 'Enter a valid Kenyan phone number (0712345678)')
      return
    }

    setLoading(true)
    try {
      const apiPhone = formatPhoneForAPI(phone)
      
      const { data, error } = await supabase
        .from('workers')
        .select('name')
        .eq('phone', apiPhone)
        .single()
      
      if (error || !data) {
        Alert.alert('Account Not Found', 'No account found with this number. Please sign up first.')
        setLoading(false)
        return
      }
      
      setUserName(data.name)
      
      await sendOTP(apiPhone)
      
      setStep('otp')
    } catch (error) {
      console.error('Send OTP error:', error)
      Alert.alert('Error', 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid OTP')
      return
    }

    setLoading(true)
    try {
      const apiPhone = formatPhoneForAPI(phone)
      const result = await verifyOTP(apiPhone, otp, userName)
      
      if (result.success) {
        router.dismissAll()
        router.replace('/(tabs)')
      } else {
        Alert.alert('Invalid OTP', result.error || 'Please check your OTP and try again')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP')
    } finally {
      setLoading(false)
    }
  }

  const renderKeypadButton = (value: string | number, onPress: () => void, icon?: string) => (
    <TouchableOpacity style={[styles.keypadButton, phone.length === 10 && styles.keypadButtonSmall]} onPress={onPress}>
      {icon ? (
        <MaterialIcons name={icon as any} size={phone.length === 10 ? 20 : 28} color="#fff" />
      ) : (
        <Text style={[styles.keypadText, phone.length === 10 && styles.keypadTextSmall]}>{value}</Text>
      )}
    </TouchableOpacity>
  )

  const renderPhoneStep = () => (
    <View style={styles.container}>
      <View style={styles.fixedTopSection}>
        <Text style={styles.label}>ENTER PHONE NUMBER:</Text>
        <View style={styles.phoneBoxes}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <View key={index} style={[styles.phoneBox, { width: '8%' }]}>
              <Text style={styles.phoneDigit}>
                {phone.length > index ? phone[index] : ''}
              </Text>
            </View>
          ))}
        </View>

        <TextInput
          style={styles.hiddenInput}
          value={phone}
          onChangeText={setPhone}
          keyboardType="numeric"
          maxLength={10}
          showSoftInputOnFocus={false}
          caretHidden
        />
      </View>

      <View style={styles.keypadContainer}>
        <View style={styles.keypad}>
          <View style={[styles.keypadRow, phone.length === 10 && styles.keypadRowSmall]}>
            {renderKeypadButton(1, () => phone.length < 10 && setPhone(phone + '1'))}
            {renderKeypadButton(2, () => phone.length < 10 && setPhone(phone + '2'))}
            {renderKeypadButton(3, () => phone.length < 10 && setPhone(phone + '3'))}
          </View>
          <View style={[styles.keypadRow, phone.length === 10 && styles.keypadRowSmall]}>
            {renderKeypadButton(4, () => phone.length < 10 && setPhone(phone + '4'))}
            {renderKeypadButton(5, () => phone.length < 10 && setPhone(phone + '5'))}
            {renderKeypadButton(6, () => phone.length < 10 && setPhone(phone + '6'))}
          </View>
          <View style={[styles.keypadRow, phone.length === 10 && styles.keypadRowSmall]}>
            {renderKeypadButton(7, () => phone.length < 10 && setPhone(phone + '7'))}
            {renderKeypadButton(8, () => phone.length < 10 && setPhone(phone + '8'))}
            {renderKeypadButton(9, () => phone.length < 10 && setPhone(phone + '9'))}
          </View>
          <View style={[styles.keypadRow, phone.length === 10 && styles.keypadRowSmall]}>
            {biometricAvailable ? renderKeypadButton('', () => handleBiometricLogin(), 'fingerprint') : <View style={styles.keypadButton} />}
            {renderKeypadButton(0, () => phone.length < 10 && setPhone(phone + '0'))}
            {renderKeypadButton('', () => setPhone(phone.slice(0, -1)), 'backspace')}
          </View>
        </View>
      </View>
    </View>
  )

  const renderOTPStep = () => (
    <View style={styles.container}>
      <View style={styles.fixedTopSection}>
        <Text style={styles.label}>ENTER OTP:</Text>
        
        <View style={styles.otpDots}>
          {[0, 1, 2, 3].map((index) => (
            <View 
              key={index} 
              style={[
                styles.otpDot, 
                otp.length > index && styles.otpDotFilled
              ]} 
            />
          ))}
        </View>

        <TextInput
          style={styles.hiddenInput}
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={4}
          showSoftInputOnFocus={false}
          caretHidden
        />
      </View>

      <View style={styles.keypadContainer}>
        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            {renderKeypadButton(1, () => otp.length < 4 && setOtp(otp + '1'))}
            {renderKeypadButton(2, () => otp.length < 4 && setOtp(otp + '2'))}
            {renderKeypadButton(3, () => otp.length < 4 && setOtp(otp + '3'))}
          </View>
          <View style={styles.keypadRow}>
            {renderKeypadButton(4, () => otp.length < 4 && setOtp(otp + '4'))}
            {renderKeypadButton(5, () => otp.length < 4 && setOtp(otp + '5'))}
            {renderKeypadButton(6, () => otp.length < 4 && setOtp(otp + '6'))}
          </View>
          <View style={styles.keypadRow}>
            {renderKeypadButton(7, () => otp.length < 4 && setOtp(otp + '7'))}
            {renderKeypadButton(8, () => otp.length < 4 && setOtp(otp + '8'))}
            {renderKeypadButton(9, () => otp.length < 4 && setOtp(otp + '9'))}
          </View>
          <View style={styles.keypadRow}>
            <View style={styles.keypadButton} />
            {renderKeypadButton(0, () => otp.length < 4 && setOtp(otp + '0'))}
            {biometricAvailable ? renderKeypadButton('', () => handleBiometricLogin(), 'fingerprint') : renderKeypadButton('', () => setOtp(otp.slice(0, -1)), 'backspace')}
          </View>
        </View>
      </View>
    </View>
  )

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.wrapper}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {step === 'phone' ? (
        <>
          {renderPhoneStep()}
          <View style={styles.bottomActions}>
            {phone.length === 10 && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleSendOTP}
                disabled={loading}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Sending...' : 'Continue'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      ) : renderOTPStep()}

      <FingerprintModal
        visible={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onAuthenticate={handleBiometricLogin}
        biometricType={biometricType}
        loading={biometricLoading}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  fixedTopSection: {
    paddingBottom: 20,
  },
  keypadContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 60,
  },

  label: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.medium,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
  },
  phoneBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  phoneBox: {
    height: 40,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  phoneDigit: {
    fontSize: 18,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
    color: '#fff',
  },
  otpDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
    gap: 20,
  },
  otpDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#666',
    backgroundColor: 'transparent',
  },
  otpDotFilled: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  keypad: {
    alignItems: 'center',
    marginBottom: 20,
    height: '50%',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  keypadButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadText: {
    fontSize: 24,
    fontFamily: fonts.light,
    fontWeight: fontWeights.light,
    color: '#fff',
  },
  keypadRowSmall: {
    marginBottom: 10,
  },
  keypadButtonSmall: {
    width: 40,
    height: 40,
  },
  keypadTextSmall: {
    fontSize: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  bottomActions: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(10,10,10,0.95)',
  },

  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 50,
    paddingVertical: 16,
    borderRadius: 25,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: fonts.medium,
    fontWeight: fontWeights.semibold,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
})

export default function SignInScreen() {
  return (
    <ThemeProvider>
      <SignInContent />
    </ThemeProvider>
  )
}