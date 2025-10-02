import { Alert } from 'react-native'

export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

export class ErrorHandler {
  static handle(error: any, context?: string): AppError {
    const appError: AppError = {
      code: error.code || 'UNKNOWN_ERROR',
      message: this.getUserFriendlyMessage(error),
      details: error,
      timestamp: new Date()
    }
    
    // Log error only in development
    if (__DEV__) {
      console.error(`[${context}]`, appError)
    }
    
    return appError
  }
  
  static showUserError(error: AppError) {
    Alert.alert('Error', error.message)
  }
  
  private static getUserFriendlyMessage(error: any): string {
    // Return the actual error message first
    if (error.message) {
      // Only convert to generic message for actual network errors
      if (error.message.includes('fetch') || error.message.includes('Network request failed')) {
        return 'Network connection failed. Please check your internet connection.'
      }
      return error.message
    }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR') {
      return 'Network connection failed. Please check your internet connection.'
    }
    
    // M-Pesa specific errors
    if (error.response?.status === 400) {
      return 'Invalid request. Please try again.'
    }
    
    if (error.response?.status === 401) {
      return 'Authentication failed. Please restart the app.'
    }
    
    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    
    if (error.response?.status >= 500) {
      return 'Service temporarily unavailable. Please try again later.'
    }
    
    return 'An unexpected error occurred. Please try again.'
  }
}

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ success: boolean; data?: T; error?: AppError }> => {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    const appError = ErrorHandler.handle(error, context)
    return { success: false, error: appError }
  }
}