// Phone number utility functions
export const formatPhoneForDisplay = (phone: string): string => {
  // Convert +254712345678 to 0712345678 for display
  if (phone.startsWith('+254')) {
    return '0' + phone.substring(4)
  }
  return phone
}

export const formatPhoneForAPI = (phone: string): string => {
  // Convert 0712345678 to 254712345678 for APIs
  if (phone.startsWith('0')) {
    return '254' + phone.substring(1)
  }
  if (phone.startsWith('+254')) {
    return phone.substring(1)
  }
  if (phone.startsWith('254')) {
    return phone
  }
  return '254' + phone
}

export const formatPhoneForSMS = (phone: string): string => {
  // Convert to +254712345678 for SMS
  const apiFormat = formatPhoneForAPI(phone)
  return '+' + apiFormat
}

export const validateKenyanPhone = (phone: string): boolean => {
  // Validate Kenyan phone number format
  const cleaned = phone.replace(/\s+/g, '')
  
  // Check if it's a valid Kenyan number
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return /^0[17]\d{8}$/.test(cleaned)
  }
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return /^254[17]\d{8}$/.test(cleaned)
  }
  if (cleaned.startsWith('+254') && cleaned.length === 13) {
    return /^\+254[17]\d{8}$/.test(cleaned)
  }
  
  return false
}