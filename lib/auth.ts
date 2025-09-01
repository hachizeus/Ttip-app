import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import { 
  storeSessionToken, 
  getStoredSessionToken, 
  clearStoredSession,
  authenticateWithBiometric,
  getBiometricCapability
} from './biometric-auth'

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export const sendOTP = async (phone: string) => {
  try {
    console.log('Sending OTP to:', phone, 'Backend URL:', BACKEND_URL)
    const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    const result = await response.json()
    console.log('OTP response:', result)
    return result
  } catch (error) {
    console.error('OTP send error:', error)
    throw new Error('Failed to send OTP')
  }
}

export const verifyOTP = async (phone: string, otp: string, userName?: string) => {
  try {
    // Set login in progress flag
    const { setLoginInProgress } = await import('./biometric-auth')
    setLoginInProgress(true)
    
    const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    })
    const result = await response.json()
    
    if (result.success) {
      await AsyncStorage.setItem('userPhone', phone)
      await AsyncStorage.setItem('isLoggedIn', 'true')
      if (userName) {
        await AsyncStorage.setItem('userName', userName)
      }
      
      // Store session token for biometric auth
      const sessionToken = `${phone}_${Date.now()}`
      await storeSessionToken(sessionToken)
      
      // Clear login flag after delay
      setTimeout(() => setLoginInProgress(false), 2000)
    } else {
      setLoginInProgress(false)
    }
    
    return result
  } catch (error) {
    const { setLoginInProgress } = await import('./biometric-auth')
    setLoginInProgress(false)
    throw new Error('Failed to verify OTP')
  }
}

export const logout = async () => {
  await AsyncStorage.removeItem('userPhone')
  await AsyncStorage.removeItem('isLoggedIn')
  await AsyncStorage.removeItem('userName')
  // Temporarily disable session clearing for biometric testing
  // await clearStoredSession()
}

export const loginWithBiometric = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    // First authenticate with biometric
    const biometricResult = await authenticateWithBiometric()
    if (!biometricResult.success) {
      return biometricResult
    }
    
    // Get stored session token
    const sessionToken = await getStoredSessionToken()
    if (!sessionToken) {
      return { success: false, error: 'No stored session found' }
    }
    
    // Validate session token (extract phone from token)
    const phone = sessionToken.split('_')[0]
    if (!phone) {
      return { success: false, error: 'Invalid session token' }
    }
    
    // Check if user still exists in database
    const { data, error } = await supabase
      .from('workers')
      .select('name')
      .eq('phone', phone)
      .single()
    
    if (error || !data) {
      await clearStoredSession()
      return { success: false, error: 'User not found' }
    }
    
    // Set login state
    await AsyncStorage.setItem('userPhone', phone)
    await AsyncStorage.setItem('isLoggedIn', 'true')
    await AsyncStorage.setItem('userName', data.name)
    
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Biometric login failed' }
  }
}

export const getBiometricInfo = getBiometricCapability

export const isLoggedIn = async (): Promise<boolean> => {
  const loggedIn = await AsyncStorage.getItem('isLoggedIn')
  if (loggedIn !== 'true') return false
  
  // Check if user still exists in database
  const phone = await AsyncStorage.getItem('userPhone')
  if (phone) {
    const { data, error } = await supabase
      .from('workers')
      .select('id')
      .eq('phone', phone)
      .single()
    
    if (error || !data) {
      // User deleted from database, auto logout
      await logout()
      return false
    }
  }
  
  return true
}

export const getCurrentUser = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userPhone')
}

export const getCurrentUserName = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userName')
}