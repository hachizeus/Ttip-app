// Test the updated phone number formatting
const formatPhoneForAPI = (phone) => {
  // Convert phone number to 254XXXXXXXXX format for APIs
  const cleaned = phone.replace(/\D/g, '') // Remove non-digits
  
  // Handle 0712345678 format (10 digits starting with 0)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1)
  }
  
  // Handle 254712345678 format (already correct)
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned
  }
  
  // Handle 712345678 format (9 digits starting with 7 or 1)
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return '254' + cleaned
  }
  
  // Handle 7123456789 format (10 digits starting with 7 or 1) - this is likely an error, truncate to 9
  if (cleaned.length === 10 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return '254' + cleaned.substring(0, 9) // Take only first 9 digits
  }
  
  // Fallback: assume it's a 9-digit number and add 254 prefix
  if (cleaned.length === 9) {
    return '254' + cleaned
  }
  
  return '254' + cleaned
}

const validateKenyanPhone = (phone) => {
  // Validate Kenyan phone number format
  const cleaned = phone.replace(/\D/g, '') // Remove non-digits
  
  // Accept 9-digit numbers starting with 7 or 1 (without leading 0) - PREFERRED FORMAT
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return /^[17]\d{8}$/.test(cleaned)
  }
  
  // Accept traditional format with leading 0 (0712345678)
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return /^0[17]\d{8}$/.test(cleaned)
  }
  
  // Accept full international format (254712345678)
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return /^254[17]\d{8}$/.test(cleaned)
  }
  
  // Reject 10-digit numbers starting with 7 or 1 (likely user error)
  if (cleaned.length === 10 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return false // This is likely an error - should be 9 digits
  }
  
  return false
}

// Test cases
const testCases = [
  '712345678',    // 9-digit without leading 0
  '7123456789',   // 10-digit starting with 7
  '1123456789',   // 10-digit starting with 1
  '0712345678',   // Traditional format with 0
  '254712345678', // Full international format
  '712 345 678',  // With spaces
  '+254712345678' // With + prefix
]

console.log('=== Phone Number Formatting Test ===')
testCases.forEach(phone => {
  const isValid = validateKenyanPhone(phone)
  const formatted = formatPhoneForAPI(phone)
  console.log(`Input: ${phone.padEnd(15)} | Valid: ${isValid.toString().padEnd(5)} | Formatted: ${formatted}`)
})

console.log('\n=== Expected Results ===')
console.log('All should format to 254XXXXXXXXX and be valid (except invalid formats)')