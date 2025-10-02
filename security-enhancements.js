// Enhanced Security Implementation for TTIP

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'

// 1. PIN Security
export class PINSecurity {
  static async hashPIN(pin) {
    const salt = await bcrypt.genSalt(12)
    return bcrypt.hash(pin, salt)
  }
  
  static async verifyPIN(pin, hash) {
    return bcrypt.compare(pin, hash)
  }
  
  static validatePINStrength(pin) {
    // Must be 4-6 digits, not sequential, not repeated
    if (!/^\d{4,6}$/.test(pin)) return false
    if (/^(\d)\1+$/.test(pin)) return false // No repeated digits
    if (/^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(pin)) return false
    return true
  }
}

// 2. Request Signing & Replay Attack Prevention
export class RequestSecurity {
  static signRequest(payload, timestamp, secret) {
    const message = `${JSON.stringify(payload)}:${timestamp}`
    return crypto.createHmac('sha256', secret).update(message).digest('hex')
  }
  
  static verifySignature(payload, timestamp, signature, secret) {
    const expectedSignature = this.signRequest(payload, timestamp, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }
  
  static validateTimestamp(timestamp, windowMs = 300000) { // 5 minutes
    const now = Date.now()
    return Math.abs(now - timestamp) <= windowMs
  }
}

// 3. Advanced Rate Limiting
export const createRateLimiters = () => ({
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP'
  }),
  
  // Payment requests (stricter)
  payment: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many payment requests'
  }),
  
  // OTP requests (very strict)
  otp: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many OTP requests'
  }),
  
  // Login attempts
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many login attempts'
  })
})

// 4. Fraud Detection
export class FraudDetection {
  static async analyzeTransaction(transaction) {
    const risks = []
    
    // Check for unusual amounts
    if (transaction.amount > 10000) {
      risks.push({ type: 'high_amount', severity: 'medium' })
    }
    
    // Check for rapid successive transactions
    const recentTips = await this.getRecentTips(transaction.customer_phone, 300000) // 5 minutes
    if (recentTips.length > 3) {
      risks.push({ type: 'rapid_transactions', severity: 'high' })
    }
    
    // Check for suspicious patterns
    const customerHistory = await this.getCustomerHistory(transaction.customer_phone)
    if (customerHistory.failed_attempts > 5) {
      risks.push({ type: 'high_failure_rate', severity: 'high' })
    }
    
    return {
      riskScore: this.calculateRiskScore(risks),
      risks,
      action: this.determineAction(risks)
    }
  }
  
  static calculateRiskScore(risks) {
    const weights = { low: 1, medium: 3, high: 5 }
    return risks.reduce((score, risk) => score + weights[risk.severity], 0)
  }
  
  static determineAction(risks) {
    const highRisks = risks.filter(r => r.severity === 'high')
    if (highRisks.length > 0) return 'block'
    if (risks.length > 2) return 'review'
    return 'allow'
  }
}

// 5. Encryption for Sensitive Data
export class DataEncryption {
  static encrypt(text, key) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', key, iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }
  
  static decrypt(encryptedData, key) {
    const decipher = crypto.createDecipher('aes-256-gcm', key, Buffer.from(encryptedData.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }
}

// 6. JWT Token Management
export class TokenManager {
  static generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' })
  }
  
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' })
  }
  
  static verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret)
    } catch (error) {
      throw new Error('Invalid token')
    }
  }
}

// 7. Biometric Authentication Helper
export class BiometricAuth {
  static async verifyBiometric(userId, biometricData) {
    // This would integrate with device biometric APIs
    // For now, return a mock verification
    return {
      verified: true,
      confidence: 0.95,
      method: 'fingerprint' // or 'face', 'voice'
    }
  }
}

// 8. Security Middleware
export const securityMiddleware = {
  // Validate request signature
  validateSignature: (req, res, next) => {
    const { signature, timestamp } = req.headers
    const payload = req.body
    
    if (!RequestSecurity.validateTimestamp(timestamp)) {
      return res.status(401).json({ error: 'Request expired' })
    }
    
    if (!RequestSecurity.verifySignature(payload, timestamp, signature, process.env.API_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
    
    next()
  },
  
  // Require authentication
  requireAuth: (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    try {
      const decoded = TokenManager.verifyToken(token, process.env.JWT_SECRET)
      req.user = decoded
      next()
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  },
  
  // Check user permissions
  requireRole: (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// 9. Security Headers
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  next()
}

// 10. Input Validation
export class InputValidator {
  static validatePhone(phone) {
    return /^254[0-9]{9}$/.test(phone) || /^0[0-9]{9}$/.test(phone)
  }
  
  static validateAmount(amount) {
    const num = parseFloat(amount)
    return num > 0 && num <= 100000 && /^\d+(\.\d{1,2})?$/.test(amount)
  }
  
  static sanitizeInput(input) {
    return input.toString().trim().replace(/[<>]/g, '')
  }
  
  static validateWorkerID(workerID) {
    return /^[A-Z0-9]{6,10}$/.test(workerID)
  }
}