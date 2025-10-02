import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native'
import FingerprintModal from '../components/FingerprintModal'
import { getBiometricInfo, loginWithBiometric, sendOTP, verifyOTP } from '../lib/auth'
import { fonts } from '../lib/fonts'
import { formatPhoneForAPI, validateKenyanPhone } from '../lib/phone-utils'
import { supabase } from '../lib/supabase'
import { useTheme } from '../lib/theme-context'

function SignInScreen() {
  const { colors } = useTheme();
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
  const shakeAnimation = useRef(new Animated.Value(0)).current
  const pulseAnimation = useRef(new Animated.Value(1)).current
  const scaleAnimation = useRef(new Animated.Value(1)).current

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

  useEffect(() => {
    if (phone.length === 10) {
      handleSendOTP()
    }
  }, [phone])

  useEffect(() => {
    // Scale animation when typing
    Animated.spring(scaleAnimation, {
      toValue: phone.length > 0 ? 1.05 : 1,
      useNativeDriver: true,
    }).start()
  }, [phone])



  const shakeInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start()
  }

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnimation, { toValue: 1, duration: 500, useNativeDriver: true })
      ])
    ).start()
  }

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation()
    pulseAnimation.setValue(1)
  }

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
      } else {
        console.log('Biometric login failed:', result.error)
        // Silently handle biometric failures without showing alerts
      }
    } catch (error) {
      console.log('Biometric login error:', error)
      Alert.alert('Error', 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!validateKenyanPhone(phone)) {
      shakeInput()
      Vibration.vibrate(500)
      setTimeout(() => setPhone(''), 400)
      return
    }

    setLoading(true)
    startPulseAnimation()
    try {
      const apiPhone = formatPhoneForAPI(phone)
      
      const { data, error } = await supabase
        .from('workers')
        .select('name')
        .eq('phone', apiPhone)
        .single()
      
      if (error || !data) {
        shakeInput()
        Vibration.vibrate(500)
        setTimeout(() => setPhone(''), 400)
        setLoading(false)
        return
      }
      
      setUserName(data.name)
      
      await sendOTP(apiPhone)
      
      setStep('otp')
    } catch (error) {
      console.error('Send OTP error:', error)
      shakeInput()
      Vibration.vibrate(500)
      setTimeout(() => setPhone(''), 400)
    } finally {
      setLoading(false)
      stopPulseAnimation()
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
  <TouchableOpacity style={styles.keypadButton} onPress={onPress}>
      {icon ? (
        icon === 'biometric' ? (
          biometricType === 'Face ID' ? (
            <MaterialIcons name="face" size={28} color={colors.text} />
          ) : (
            <MaterialIcons name="fingerprint" size={28} color={colors.text} />
          )
        ) : (
          <MaterialIcons name={icon as any} size={28} color={colors.text} />
        )
      ) : (
        <Text style={[styles.keypadText, { color: colors.text }]}>{value}</Text>
      )}
    </TouchableOpacity>
  )

  const renderPhoneStep = () => (
    <View style={styles.container}>
      {/* Back Arrow */}
      <TouchableOpacity style={{ position: 'absolute', left: 0, top: 40, zIndex: 10, padding: 8 }} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={28} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.logoContainer}>
        <Image source={require('../assets/images/mylogo.png')} style={styles.logo} />
      </View>
      <View style={styles.fixedTopSection}>
        <Text style={styles.label}>ENTER PHONE NUMBER:</Text>
        <Animated.View style={[styles.phoneBoxes, { transform: [{ translateX: shakeAnimation }, { scale: loading ? pulseAnimation : scaleAnimation }] }] }>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <View key={index} style={[styles.phoneBox, { width: '8%' }] }>
              <Text style={[styles.phoneDigit, { color: colors.text }]}>
                {phone.length > index ? phone[index] : ''}
              </Text>
            </View>
          ))}
        </Animated.View>

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
          <View style={styles.keypadRow}>
            {renderKeypadButton(1, () => phone.length < 10 && setPhone(phone + '1'))}
            {renderKeypadButton(2, () => phone.length < 10 && setPhone(phone + '2'))}
            {renderKeypadButton(3, () => phone.length < 10 && setPhone(phone + '3'))}
          </View>
          <View style={styles.keypadRow}>
            {renderKeypadButton(4, () => phone.length < 10 && setPhone(phone + '4'))}
            {renderKeypadButton(5, () => phone.length < 10 && setPhone(phone + '5'))}
            {renderKeypadButton(6, () => phone.length < 10 && setPhone(phone + '6'))}
          </View>
          <View style={styles.keypadRow}>
            {renderKeypadButton(7, () => phone.length < 10 && setPhone(phone + '7'))}
            {renderKeypadButton(8, () => phone.length < 10 && setPhone(phone + '8'))}
            {renderKeypadButton(9, () => phone.length < 10 && setPhone(phone + '9'))}
          </View>
          <View style={styles.keypadRow}>
            {biometricAvailable ? renderKeypadButton('', () => handleBiometricLogin(), 'biometric') : <View style={styles.keypadButton} />}
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
              style={[styles.otpDot, otp.length > index ? styles.otpDotFilled : null]}
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
            {biometricAvailable ? renderKeypadButton('', () => handleBiometricLogin(), 'biometric') : <View style={styles.keypadButton} />}
            {renderKeypadButton(0, () => otp.length < 4 && setOtp(otp + '0'))}
            {renderKeypadButton('', () => setOtp(otp.slice(0, -1)), 'backspace')}
          </View>
        </View>
      </View>
    </View>
  )

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.wrapper, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {step === 'phone' ? renderPhoneStep() : renderOTPStep()}
      
      <View style={styles.developerCredit}>
        <Image source={require('../assets/images/mylogo.png')} style={styles.creditLogo} />
        <Text style={styles.creditText}>Developed by ElitJohns Digital Services</Text>
      </View>

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

export default SignInScreen

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
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
    justifyContent: 'center',
    paddingBottom: 5,
  },

  label: {
    fontSize: 16,
    fontFamily: fonts.medium,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  phoneBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 20,
  },
  phoneBox: {
    height: 40,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF20',
  },
  phoneDigit: {
    fontSize: 18,
    fontFamily: fonts.medium,
    fontWeight: '600',
  },
  otpDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 20,
  },
  otpDot: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  otpDotFilled: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  keypad: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 80,
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
    fontWeight: '300',
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
    fontWeight: '600',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
  },
  developerCredit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  creditLogo: {
    width: 30,
    height: 10,
    resizeMode: 'contain',
  },
  creditText: {
    fontSize: 11,
    color: '#666666',
  },
})

