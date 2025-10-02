import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

// Separate function for online user validation (optional)
export const validateUserOnline = async (): Promise<boolean> => {
  try {
    const phone = await AsyncStorage.getItem('userPhone')
    if (!phone) return false
    
    const { data, error } = await supabase
      .from('workers')
      .select('id')
      .eq('phone', phone)
      .single()
    
    return !error && !!data
  } catch (error) {
    // Network error - assume user is valid
    return true
  }
}

// Check if user should be logged out (only call when online)
export const shouldLogoutUser = async (): Promise<boolean> => {
  try {
    const isValid = await validateUserOnline()
    return !isValid
  } catch (error) {
    // Don't logout on network errors
    return false
  }
}