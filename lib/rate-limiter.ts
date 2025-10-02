export class RateLimiter {
  static async checkLimit(key: string, type: string) {
    return { allowed: true }
  }
  
  static async reset(key: string, type: string) {
    return true
  }
}