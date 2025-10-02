export class InputValidator {
  static sanitizePhone(phone: string): string {
    if (!phone) return ''
    // Only remove spaces, dashes, parentheses - keep all digits including leading zero
    return phone.replace(/[\s\-\(\)\+]/g, '')
  }
  
  static validateKenyanPhone(phone: string): boolean {
    if (!phone) return false
    
    const sanitized = this.sanitizePhone(phone)
    
    // Check different formats
    if (sanitized.length === 10 && sanitized.startsWith('0')) {
      return /^0[1-9]\d{8}$/.test(sanitized)
    }
    
    if (sanitized.length === 12 && sanitized.startsWith('254')) {
      return /^254[1-9]\d{8}$/.test(sanitized)
    }
    
    if (sanitized.length === 13 && sanitized.startsWith('+254')) {
      return /^\+254[1-9]\d{8}$/.test(sanitized)
    }
    
    return false
  }
  
  static sanitizeOTP(otp: string): string {
    // Remove all non-numeric characters and limit to 4 digits
    return otp.replace(/\D/g, '').slice(0, 4)
  }
  
  static validateOTP(otp: string): boolean {
    const sanitized = this.sanitizeOTP(otp)
    return /^\d{4}$/.test(sanitized)
  }
  
  static sanitizeAmount(amount: string): string {
    // Remove all non-numeric characters except decimal point
    return amount.replace(/[^\d.]/g, '')
  }
  
  static validateAmount(amount: string): boolean {
    const sanitized = this.sanitizeAmount(amount)
    const num = parseFloat(sanitized)
    
    // Must be a valid number, greater than 0, and less than 70000 (M-Pesa limit)
    return !isNaN(num) && num > 0 && num <= 70000
  }
  
  static escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}