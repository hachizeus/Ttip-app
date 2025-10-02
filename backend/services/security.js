import crypto from 'crypto';
// import jwt from 'jsonwebtoken';
// import speakeasy from 'speakeasy'; // Commented for testing
import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

export class SecurityService {
    constructor() {
        this.webhookSecret = process.env.WEBHOOK_SECRET || 'default-secret';
        this.jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret';
        this.idempotencyCache = new Map();
    }

    // HMAC Webhook Validation
    validateWebhookSignature(payload, signature, timestamp) {
        if (!signature || !timestamp) return false;
        
        // Check timestamp (prevent replay attacks)
        const now = Math.floor(Date.now() / 1000);
        const webhookTimestamp = parseInt(timestamp);
        
        if (Math.abs(now - webhookTimestamp) > 300) { // 5 minutes tolerance
            return false;
        }
        
        // Validate HMAC signature
        const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(`${timestamp}.${JSON.stringify(payload)}`)
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
    }

    // CSRF Token Validation
    validateCSRFToken(token) {
        if (!token) return false;
        
        try {
            const timestamp = parseInt(token);
            const now = Date.now();
            
            // Token valid for 5 minutes
            return Math.abs(now - timestamp) <= 300000;
        } catch {
            return false;
        }
    }

    // Idempotency Management
    async checkIdempotency(key) {
        // Check in-memory cache first
        if (this.idempotencyCache.has(key)) {
            return this.idempotencyCache.get(key);
        }
        
        // Check database
        const { data } = await supabase
            .from('idempotency_keys')
            .select('response')
            .eq('key', key)
            .single();
        
        return data?.response || null;
    }

    async storeIdempotency(key, response) {
        // Store in cache
        this.idempotencyCache.set(key, response);
        
        // Store in database
        await supabase
            .from('idempotency_keys')
            .upsert({
                key: key,
                response: response,
                created_at: new Date().toISOString()
            });
        
        // Clean up old cache entries (keep last 1000)
        if (this.idempotencyCache.size > 1000) {
            const firstKey = this.idempotencyCache.keys().next().value;
            this.idempotencyCache.delete(firstKey);
        }
    }

    // Admin Authentication with 2FA
    async authenticateAdmin(username, password, totpCode) {
        try {
            // Get admin user
            const { data: admin, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error || !admin) {
                return { success: false, error: 'Invalid credentials' };
            }
            
            // Verify password
            const passwordHash = crypto
                .createHash('sha256')
                .update(password + admin.salt)
                .digest('hex');
            
            if (passwordHash !== admin.password_hash) {
                return { success: false, error: 'Invalid credentials' };
            }
            
            // Verify TOTP
            if (admin.totp_secret) {
                const verified = speakeasy.totp.verify({
                    secret: admin.totp_secret,
                    encoding: 'base32',
                    token: totpCode,
                    window: 2
                });
                
                if (!verified) {
                    return { success: false, error: 'Invalid 2FA code' };
                }
            }
            
            // Update last login
            await supabase
                .from('admin_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', admin.id);
            
            return {
                success: true,
                user: {
                    id: admin.id,
                    username: admin.username,
                    role: admin.role
                }
            };
        } catch (error) {
            return { success: false, error: 'Authentication failed' };
        }
    }

    generateAdminToken(user) {
        return jwt.sign(
            { 
                userId: user.id, 
                username: user.username, 
                role: user.role 
            },
            this.jwtSecret,
            { expiresIn: '8h' }
        );
    }

    requireAdminAuth = async (req, res, next) => {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            
            const decoded = jwt.verify(token, this.jwtSecret);
            req.adminUser = decoded;
            
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };

    // PII Masking
    maskPII(value) {
        if (!value) return value;
        
        if (value.includes('@')) {
            // Email masking
            const [local, domain] = value.split('@');
            return `${local.substring(0, 2)}***@${domain}`;
        } else if (value.match(/^\d+$/)) {
            // Phone number masking
            return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
        }
        
        return value;
    }

    // Data Encryption (for PII at rest)
    encryptPII(data) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipher(algorithm, key, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decryptPII(encryptedData) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
        
        const decipher = crypto.createDecipher(
            algorithm, 
            key, 
            Buffer.from(encryptedData.iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    // Generate TOTP Secret for new admin
    generateTOTPSecret(username) {
        return speakeasy.generateSecret({
            name: `TTip Admin (${username})`,
            issuer: 'TTip'
        });
    }

    // Rate limiting helper
    createRateLimiter(windowMs, max) {
        const requests = new Map();
        
        return (req, res, next) => {
            const key = req.ip;
            const now = Date.now();
            
            if (!requests.has(key)) {
                requests.set(key, []);
            }
            
            const userRequests = requests.get(key);
            
            // Remove old requests
            const validRequests = userRequests.filter(time => now - time < windowMs);
            
            if (validRequests.length >= max) {
                return res.status(429).json({ error: 'Too many requests' });
            }
            
            validRequests.push(now);
            requests.set(key, validRequests);
            
            next();
        };
    }
}