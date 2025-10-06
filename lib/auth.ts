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
    console.log('Sending OTP to:', phone)
    console.log('Backend URL:', BACKEND_URL)
    
    const response = await fetch(`${BACKEND_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    })
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Server error:', errorText)
      throw new Error(`Server error: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text()
      console.error('Non-JSON response:', responseText)
      throw new Error('Server returned HTML instead of JSON. Check if backend is running.')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Send OTP error:', error)
    throw error
  }
}

export const verifyOTP = async (phone: string, otp: string, userName?: string) => {
  try {
    console.log('Verifying OTP for:', phone)
    console.log('Backend URL:', BACKEND_URL)
    
    const response = await fetch(`${BACKEND_URL}/api/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp })
    })
    
    console.log('Response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Server error:', errorText)
      throw new Error(`Server error: ${response.status}`)
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text()
      console.error('Non-JSON response:', responseText)
      throw new Error('Server returned HTML instead of JSON. Check if backend is running.')
    }
    
    const result = await response.json()
    
    if (result.success) {
      // Clear any existing session first
      await clearStoredSession()
      
      await AsyncStorage.setItem('userPhone', phone)
      await AsyncStorage.setItem('isLoggedIn', 'true')
      if (userName) {
        await AsyncStorage.setItem('userName', userName)
      }
      
      // Store new session token for biometric login
      const sessionToken = `${phone}_${Date.now()}`
      await storeSessionToken(sessionToken)
    }
    
    return result
  } catch (error) {
    console.error('Verify OTP error:', error)
    throw error
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
    console.log('Starting biometric login...')
    
    // Get stored session token first
    const sessionToken = await getStoredSessionToken()
    if (!sessionToken) {
      console.log('No stored session found')
      return { success: false, error: 'Please sign in with OTP first to enable biometric login' }
    }
    
    // Validate session token (extract phone from token)
    const phone = sessionToken.split('_')[0]
    if (!phone) {
      console.log('Invalid session token')
      await clearStoredSession()
      return { success: false, error: 'Invalid session. Please sign in again.' }
    }
    
    // Check if user still exists in database (skip when offline)
    let userName = phone // fallback
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('name')
        .eq('phone', phone)
        .single()
      
      if (error || !data) {
        console.log('User not found in database')
        await clearStoredSession()
        return { success: false, error: 'User not found. Please sign in again.' }
      }
      userName = data.name
    } catch (error) {
      // Network error - use cached name or phone as fallback
      const cachedName = await AsyncStorage.getItem('userName')
      userName = cachedName || phone
      console.log('Using cached user data for offline biometric login')
    }
    
    // Now authenticate with biometric
    console.log('Prompting biometric authentication...')
    const biometricResult = await authenticateWithBiometric()
    if (!biometricResult.success) {
      console.log('Biometric authentication failed:', biometricResult.error)
      return biometricResult
    }
    
    console.log('Biometric authentication successful')
    
    // Set login state
    await AsyncStorage.setItem('userPhone', phone)
    await AsyncStorage.setItem('isLoggedIn', 'true')
    await AsyncStorage.setItem('userName', userName)
    
    return { success: true }
  } catch (error) {
    console.error('Biometric login error:', error)
    return { success: false, error: 'Biometric login failed' }
  }
}

export const getBiometricInfo = getBiometricCapability

export const isLoggedIn = async (): Promise<boolean> => {
  const loggedIn = await AsyncStorage.getItem('isLoggedIn')
  return loggedIn === 'true'
}

export const getCurrentUser = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userPhone')
}

export const getCurrentUserName = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userName')
}