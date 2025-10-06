import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import crypto from 'crypto';
import { configDotenv } from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import path from 'path';
import { requireAdminAuth } from './admin-auth.js';
import { initiateMpesaPayment } from './daraja.mjs';
import { getWorkerNotifications, markNotificationRead } from './notifications-service.js';
import { enqueuePayout, getQueueStatus } from './payment-queue.js';
import { generateQRCode, getWorkerQR } from './qr-service.js';
import { submitCustomerReview } from './reviews-service.js';
import { acceptTeamInvite, createTeam, getTeamStats, inviteWorkerToTeam } from './teams-service.js';

// HTML escaping function to prevent XSS
const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

configDotenv();

// Validate required environment variables
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'CONSUMER_KEY',
    'CONSUMER_SECRET',
    'SHORT_CODE',
    'PASSKEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Enhanced rate limiting
const stkPushLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 requests per IP
    message: { error: 'Too many payment requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
    message: { error: 'Too many requests. Please try again later.' }
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many admin requests. Please try again later.' }
});

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Apply general rate limiting to all routes (except payment status)
app.use((req, res, next) => {
    if (req.path === '/api/payment-status') {
        return next(); // Skip rate limiting for payment status
    }
    generalLimiter(req, res, next);
});

app.use(express.json({ limit: '1mb' })); // Reduced from 10mb
app.use('/assets', express.static(path.join(process.cwd(), '../assets')));
app.use(express.static(path.join(process.cwd(), '../public')));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'https://ttip-app.onrender.com',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Enhanced CSRF protection
const csrfTokens = new Map(); // In production, use Redis

// Data encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const ALGORITHM = 'aes-256-gcm';

const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedData) => {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

const maskPII = (value) => {
    if (!value) return value;
    if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
    } else if (value.match(/^\d+$/)) {
        return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
    }
    return value;
};

// Structured logging utility
const logger = {
    info: (message, meta = {}) => {
        console.log(JSON.stringify({
            level: 'info',
            message,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    error: (message, error = null, meta = {}) => {
        console.error(JSON.stringify({
            level: 'error',
            message,
            error: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    },
    warn: (message, meta = {}) => {
        console.warn(JSON.stringify({
            level: 'warn',
            message,
            timestamp: new Date().toISOString(),
            ...meta
        }));
    }
};

// Request ID middleware for tracking
app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    
    // Log all requests
    logger.info('Request received', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    next();
});

const generateCSRFToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    csrfTokens.set(token, timestamp);
    // Clean old tokens
    for (const [key, time] of csrfTokens.entries()) {
        if (Date.now() - time > 300000) { // 5 minutes
            csrfTokens.delete(key);
        }
    }
    return token;
};

const csrfProtection = (req, res, next) => {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    if (!token || !csrfTokens.has(token)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    const tokenTime = csrfTokens.get(token);
    if (Date.now() - tokenTime > 300000) { // 5 minutes
        csrfTokens.delete(token);
        return res.status(403).json({ error: 'CSRF token expired' });
    }
    csrfTokens.delete(token); // One-time use
    next();
};

// ===== OTP AUTHENTICATION ENDPOINTS =====

// Simple OTP storage (in production, use Redis)
const otpStore = new Map();

// Generate 4-digit OTP
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;
    
    if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number required' });
    }
    
    try {
        // Format phone number
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '254' + phone.substring(1);
        }
        
        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP with 5-minute expiry
        otpStore.set(formattedPhone, {
            otp,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutes
        });
        
        console.log(`OTP for ${formattedPhone}: ${otp}`);
        
        // In production, send SMS here
        // For now, just log it
        logger.info('OTP generated', {
            phone: formattedPhone,
            otp: otp // Remove in production
        });
        
        res.json({ 
            success: true, 
            message: 'OTP sent successfully',
            // For testing only - remove in production
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
        
    } catch (error) {
        logger.error('Send OTP error', error);
        res.status(500).json({ success: false, error: 'Failed to send OTP' });
    }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
        return res.status(400).json({ success: false, error: 'Phone and OTP required' });
    }
    
    try {
        // Format phone number
        let formattedPhone = phone;
        if (phone.startsWith('0')) {
            formattedPhone = '254' + phone.substring(1);
        }
        
        // Check OTP
        const storedOTP = otpStore.get(formattedPhone);
        
        if (!storedOTP) {
            return res.json({ success: false, error: 'OTP not found or expired' });
        }
        
        if (Date.now() > storedOTP.expires) {
            otpStore.delete(formattedPhone);
            return res.json({ success: false, error: 'OTP expired' });
        }
        
        if (storedOTP.otp !== otp) {
            return res.json({ success: false, error: 'Invalid OTP' });
        }
        
        // OTP is valid - clean up
        otpStore.delete(formattedPhone);
        
        // Check if worker exists, if not create one
        let { data: worker } = await supabase
            .from('workers')
            .select('*')
            .eq('phone', formattedPhone)
            .single();
        
        if (!worker) {
            // Create new worker
            const workerId = 'W' + Date.now().toString(36).toUpperCase();
            const { data: newWorker, error } = await supabase
                .from('workers')
                .insert({
                    worker_id: workerId,
                    phone: formattedPhone,
                    name: formattedPhone, // Default name
                    occupation: 'Service Worker'
                })
                .select()
                .single();
            
            if (error) {
                logger.error('Worker creation error', error);
                return res.status(500).json({ success: false, error: 'Failed to create worker account' });
            }
            
            worker = newWorker;
        }
        
        logger.info('OTP verification successful', {
            phone: formattedPhone,
            workerId: worker.worker_id
        });
        
        res.json({ 
            success: true, 
            message: 'OTP verified successfully',
            worker: {
                id: worker.worker_id,
                name: worker.name,
                phone: worker.phone
            }
        });
        
    } catch (error) {
        logger.error('Verify OTP error', error);
        res.status(500).json({ success: false, error: 'Failed to verify OTP' });
    }
});

// ===== PHASE 1 ENDPOINTS (Enhanced) =====

// Generate QR Code
app.post('/generate-qr', async (req, res) => {
    const { workerId } = req.body;
    if (!workerId) return res.status(400).json({ error: 'WorkerId is required' });
    
    try {
        const qrData = await generateQRCode(workerId);
        res.json(qrData);
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Get QR code
app.get('/qr/:workerId', async (req, res) => {
    const { workerId } = req.params;
    try {
        const qrData = await getWorkerQR(workerId);
        res.json(qrData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});

// Tip route (redirect to payment page)
app.get('/tip/:workerId', async (req, res) => {
    res.redirect(`/pay/${req.params.workerId}`);
});

// Payment page (enhanced with reviews)
app.get('/pay/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('name, occupation, average_rating, review_count')
            .eq('worker_id', workerId)
            .single();
        
        const workerName = escapeHtml(worker?.name || 'Worker');
        const workerOccupation = escapeHtml(worker?.occupation || 'Service Worker');
        const rating = worker?.average_rating || 0;
        const reviewCount = worker?.review_count || 0;
        const csrfToken = generateCSRFToken();
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>TTip - Pay ${workerName}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: white; padding: 20px; }
                    .container { max-width: 400px; margin: 0 auto; background: white; }
                    
                    .logo-section { text-align: center; padding: 30px 20px 20px; background: white; color: #333; }
                    .logo { width: 60px; height: 60px; margin: 0 auto 15px; }
                    .logo img { width: 100%; height: 100%; object-fit: contain; }
                    .app-title { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
                    .app-subtitle { font-size: 14px; opacity: 0.9; }
                    
                    .content { padding: 25px; }
                    
                    .worker-section { text-align: center; margin-bottom: 25px; }
                    .worker-name { font-size: 22px; font-weight: bold; color: #333; margin-bottom: 8px; }
                    .worker-occupation { font-size: 16px; color: #666; margin-bottom: 12px; }
                    .worker-review { font-size: 14px; color: #888; }
                    .stars { color: #ffa500; margin-right: 5px; }
                    
                    .form-section { margin-top: 30px; }
                    .input-group { margin-bottom: 20px; }
                    .input-label { font-size: 14px; color: #555; margin-bottom: 8px; display: block; font-weight: 500; }
                    input { width: 100%; padding: 16px; border: 2px solid #e1e5e9; border-radius: 8px; font-size: 16px; transition: border-color 0.3s; }
                    input:focus { outline: none; border-color: #667eea; }
                    input::placeholder { color: #aaa; }
                    
                    .send-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 10px; transition: transform 0.2s; }
                    .send-btn:hover { transform: translateY(-2px); }
                    .send-btn:disabled { opacity: 0.7; transform: none; cursor: not-allowed; }
                    
                    .message { margin-top: 20px; padding: 15px; border-radius: 8px; text-align: center; font-size: 15px; }
                    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                    .loading { background: #e2e3e5; color: #383d41; border: 1px solid #d6d8db; }
                    .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
                    
                    .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo-section">
                        <div class="logo"><img src="/assets/images/mylogo.png" alt="TTip Logo"></div>
                        <div class="app-title">TTip</div>
                        <div class="app-subtitle">Quick & Secure tipping</div>
                    </div>
                    
                    <div class="content">
                        <div class="worker-section">
                            <div class="worker-name">${workerName}</div>
                            <div class="worker-occupation">(${workerOccupation})</div>
                            <div class="worker-review">
                                <span class="stars">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}</span>
                                ${rating.toFixed(1)} (${reviewCount} reviews)
                            </div>
                        </div>
                        
                        <form id="paymentForm" class="form-section">
                            <input type="hidden" name="csrfToken" value="${csrfToken}">
                            
                            <div class="input-group">
                                <label class="input-label">Amount Input</label>
                                <input type="number" id="amount" name="amount" placeholder="Enter tip amount (KSh)" min="1" max="70000" required>
                            </div>
                            
                            <div class="input-group">
                                <label class="input-label">Phone number Input</label>
                                <input type="tel" id="phone" name="phone" placeholder="0712345678" required>
                            </div>
                            
                            <button type="submit" class="send-btn" id="payBtn">
                                Send tip
                            </button>
                        </form>
                        
                        <div id="message"></div>
                    </div>
                </div>
                
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        // Phone number formatting
                        var phoneInput = document.getElementById('phone');
                        phoneInput.addEventListener('input', function(e) {
                            var value = e.target.value.replace(/\D/g, '');
                            if (value.startsWith('254')) {
                                value = '0' + value.substring(3);
                            }
                            if (value.length > 10) {
                                value = value.substring(0, 10);
                            }
                            e.target.value = value;
                        });
                        
                        // Form submission
                        var form = document.getElementById('paymentForm');
                        form.addEventListener('submit', function(e) {
                            e.preventDefault();
                            console.log('Form submission prevented');
                            
                            var amount = document.getElementById('amount').value;
                            var phone = document.getElementById('phone').value;
                            var btn = document.getElementById('payBtn');
                            var msg = document.getElementById('message');
                            
                            console.log('Processing payment:', { amount: amount, phone: phone });
                            
                            // Validation
                            if (!amount || amount < 1) {
                                alert('Please enter a tip amount of at least KSh 1');
                                return;
                            }
                            
                            if (!phone || phone.length !== 10 || !phone.startsWith('07')) {
                                alert('Please enter a valid Safaricom number (e.g., 0712345678)');
                                return;
                            }
                            
                            // Update UI
                            btn.disabled = true;
                            btn.innerHTML = 'Sending...';
                            msg.innerHTML = '<div class="message loading">Processing your tip...</div>';
                            
                            // Make payment request
                            var xhr = new XMLHttpRequest();
                            xhr.open('POST', '/api/stk-push', true);
                            xhr.setRequestHeader('Content-Type', 'application/json');
                            
                            xhr.onreadystatechange = function() {
                                if (xhr.readyState === 4) {
                                    if (xhr.status === 200) {
                                        var result = JSON.parse(xhr.responseText);
                                        console.log('STK Push result:', result);
                                        
                                        if (result.success) {
                                            msg.innerHTML = '<div class="message success">✅ STK Push sent successfully! Check your phone for M-Pesa prompt and enter your PIN</div>';
                                            
                                            // Check payment status
                                            var attempts = 0;
                                            var maxAttempts = 30; // Reduced from 60 to 30 (1 minute)
                                            
                                            // Add cancel button
                                            msg.innerHTML += '<br><button onclick="location.reload()" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">Cancel & Refresh</button>';
                                            
                                            var statusCheck = setInterval(function() {
                                                attempts++;
                                                
                                                var statusXhr = new XMLHttpRequest();
                                                statusXhr.open('GET', '/api/payment-status?checkoutRequestId=' + result.checkoutRequestId, true);
                                                
                                                statusXhr.onreadystatechange = function() {
                                                    if (statusXhr.readyState === 4 && statusXhr.status === 200) {
                                                        var statusData = JSON.parse(statusXhr.responseText);
                                                        
                                                        if (statusData.status === 'COMPLETED') {
                                                            clearInterval(statusCheck);
                                                            msg.innerHTML = '<div class="message success">Tip sent successfully! Thank you for your generosity.</div>';
                                                            btn.innerHTML = 'Tip Sent ✓';
                                                            btn.style.background = '#28a745';
                                                            
                                                            setTimeout(function() {
                                                                msg.innerHTML += '<div style="text-align: center; margin-top: 15px; color: #28a745; font-weight: 500;">You made someones day!</div>';
                                                            }, 1000);
                                                        } else if (statusData.status === 'FAILED') {
                                                            clearInterval(statusCheck);
                                                            msg.innerHTML = '<div class="message error">Payment could not be completed. Please check your M-Pesa balance and try again.</div>';
                                                            btn.disabled = false;
                                                            btn.innerHTML = 'Try Again';
                                                        }
                                                    }
                                                };
                                                
                                                statusXhr.send();
                                                
                                                if (attempts >= maxAttempts) {
                                                    clearInterval(statusCheck);
                                                    msg.innerHTML = '<div class="message warning">Payment timed out. If you cancelled or money was deducted, please refresh the page.</div>';
                                                    msg.innerHTML += '<br><button onclick="location.reload()" style="padding: 15px 30px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; margin-top: 15px; font-size: 16px;">Refresh Page</button>';
                                                    btn.disabled = false;
                                                    btn.innerHTML = 'Send tip';
                                                }
                                            }, 2000);
                                            
                                        } else {
                                            var errorMessage = result.error || 'STK Push failed. Please try again.';
                                            msg.innerHTML = '<div class="message error">❌ ' + errorMessage + '</div>';
                                            btn.disabled = false;
                                            btn.innerHTML = 'Try Again';
                                        }
                                    } else {
                                        console.error('Request failed:', xhr.status);
                                        msg.innerHTML = '<div class="message error">Network error. Please try again.</div>';
                                        btn.disabled = false;
                                        btn.innerHTML = 'Try Again';
                                    }
                                }
                            };
                            
                            var requestData = JSON.stringify({
                                workerId: '${workerId}',
                                amount: parseFloat(amount),
                                customerPhone: phone
                            });
                            
                            console.log('Sending request:', requestData);
                            xhr.send(requestData);
                        });
                    });
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Payment page error:', error);
        res.status(500).send('Error loading payment page');
    }
});

// Enhanced input validation middleware
const validateSTKPush = async (req, res, next) => {
    const { workerId, amount, customerPhone } = req.body;
    
    if (!workerId || typeof workerId !== 'string' || workerId.length > 50) {
        return res.status(400).json({ success: false, error: 'Invalid worker ID' });
    }
    
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 70000) {
        return res.status(400).json({ success: false, error: 'Amount must be between 1 and 70000' });
    }
    
    if (!customerPhone || typeof customerPhone !== 'string' || !/^(\+254|254|0)[17]\d{8}$/.test(customerPhone)) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
    }
    
    // Duplicate transaction check disabled for testing
    // const formattedPhone = customerPhone.startsWith('0') ? '254' + customerPhone.substring(1) : customerPhone;
    
    next();
};

// STK Push initiation (enhanced)
app.post('/api/stk-push', async (req, res) => {
    const { workerId, amount, customerPhone } = req.body;
    
    console.log('=== STK PUSH REQUEST RECEIVED ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Worker ID:', workerId);
    console.log('Amount:', amount);
    console.log('Customer Phone:', customerPhone);
    
    try {
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('worker_id, name')
            .eq('worker_id', workerId)
            .single();
        
        if (workerError || !worker) {
            return res.json({ success: false, error: 'Worker not found' });
        }
        
        const formattedPhone = customerPhone.startsWith('0') 
            ? '254' + customerPhone.substring(1) 
            : customerPhone;
        
        console.log('Formatted phone for STK:', formattedPhone);
        
        // Validate phone number format
        if (!formattedPhone.match(/^254[17]\d{8}$/)) {
            console.log('❌ Invalid phone number format:', formattedPhone);
            return res.json({ 
                success: false, 
                error: 'Please use a valid Safaricom number (07XXXXXXXX)' 
            });
        }
        
        // Additional validation for test numbers
        if (formattedPhone === '254708374149') {
            console.log('✅ Using Daraja test number');
        } else {
            console.log('⚠️ Using real phone number:', formattedPhone);
        }
        
        const stkResponse = await initiateMpesaPayment(formattedPhone, amount, workerId);
        
        console.log('M-Pesa STK Response:', JSON.stringify(stkResponse, null, 2));
        
        if (stkResponse.ResponseCode === '0') {
            const { error: txError } = await supabase
                .from('tips')
                .insert({
                    worker_id: workerId,
                    customer_phone: formattedPhone,
                    amount: amount,
                    status: 'pending',
                    gateway: 'daraja',
                    raw_payload: stkResponse
                });
            
            if (txError) console.error('Tip record error:', txError);
            
            console.log('✅ STK Push sent successfully, CheckoutRequestID:', stkResponse.CheckoutRequestID);
            
            res.json({ 
                success: true, 
                checkoutRequestId: stkResponse.CheckoutRequestID,
                message: 'STK Push sent successfully'
            });
        } else {
            console.log('❌ STK Push failed:', stkResponse);
            
            // Provide specific error messages for common issues
            let errorMessage = stkResponse.ResponseDescription || 'STK Push failed';
            
            if (stkResponse.ResponseCode === '1') {
                errorMessage = 'Invalid phone number. Please use a valid Safaricom number.';
            } else if (stkResponse.ResponseCode === '1037') {
                errorMessage = 'Request timeout. Please ensure your phone is on and has network coverage.';
            } else if (stkResponse.ResponseCode === '1032') {
                errorMessage = 'Request cancelled by user.';
            }
            
            res.json({ 
                success: false, 
                error: errorMessage,
                code: stkResponse.ResponseCode,
                details: stkResponse
            });
        }
        
    } catch (error) {
        logger.error('STK Push failed', error, {
            requestId: req.id,
            workerId,
            amount,
            customerPhone: maskPII(customerPhone)
        });
        res.status(500).json({ 
            success: false, 
            error: 'Payment service temporarily unavailable',
            requestId: req.id
        });
    }
});

// Commission calculation
const calculatePayout = async (workerPhone, tipAmount) => {
    const { data: worker } = await supabase
        .from('workers')
        .select('referral_credits')
        .eq('phone', workerPhone)
        .single();
    
    const commissionRate = 0.03; // 3%
    
    if (worker?.referral_credits > 0) {
        // Use referral credit - no commission
        await supabase
            .from('workers')
            .update({ referral_credits: worker.referral_credits - 1 })
            .eq('phone', workerPhone);
        
        return {
            workerPayout: tipAmount,
            commission: 0,
            usedReferralCredit: true
        };
    } else {
        // Normal commission
        const commission = Math.round(tipAmount * commissionRate);
        return {
            workerPayout: tipAmount - commission,
            commission: commission,
            usedReferralCredit: false
        };
    }
};

// Send review SMS
const sendReviewSMS = async (customerPhone, workerName, transactionId) => {
    const reviewLink = `https://ttip-app.onrender.com/review/${transactionId}`;
    const message = `Thanks for tipping ${workerName}! Rate your experience: ${reviewLink}`;
    
    // Log for now - implement SMS later
    console.log(`Review SMS to ${customerPhone}: ${message}`);
};

// Enhanced C2B callback with commission and reviews
app.post('/api/callback', async (req, res) => {
    console.log('=== API CALLBACK RECEIVED ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', req.headers);
    console.log('Timestamp:', new Date().toISOString());
    
    // Forward to the main callback handler
    return handleMpesaCallback(req, res);
});

// Main callback handler (also keep the original endpoint)
app.post('/mpesa/c2b-callback', async (req, res) => {
    return handleMpesaCallback(req, res);
});

// Shared callback handler function
async function handleMpesaCallback(req, res) {
    console.log('=== C2B CALLBACK RECEIVED ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', req.headers);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
        const { Body } = req.body;
        
        if (Body?.stkCallback) {
            const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
            
            console.log(`Processing callback for CheckoutRequestID: ${CheckoutRequestID}`);
            console.log(`Result Code: ${ResultCode}, Description: ${ResultDesc}`);
            
            if (ResultCode === 0) {
                const metadata = CallbackMetadata?.Item || [];
                const amount = metadata.find(item => item.Name === 'Amount')?.Value;
                const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
                
                console.log('Payment metadata:', { amount, mpesaReceiptNumber, phoneNumber });
                
                // Find tip by CheckoutRequestID stored in raw_payload
                const { data: tips, error: searchError } = await supabase
                    .from('tips')
                    .select('*')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(20);
                
                console.log(`Found ${tips?.length || 0} pending tips`);
                
                let tip = null;
                
                // Search through tips to find matching CheckoutRequestID
                if (tips) {
                    for (const t of tips) {
                        const rawPayload = t.raw_payload;
                        if (rawPayload && 
                            (rawPayload.CheckoutRequestID === CheckoutRequestID ||
                             JSON.stringify(rawPayload).includes(CheckoutRequestID))) {
                            tip = t;
                            console.log(`Found matching tip: ${t.id}`);
                            break;
                        }
                    }
                }
                
                if (!tip) {
                    console.error('❌ Tip not found for CheckoutRequestID:', CheckoutRequestID);
                    
                    // Log recent tips for debugging
                    const { data: recentTips } = await supabase
                        .from('tips')
                        .select('id, worker_id, amount, status, created_at, raw_payload')
                        .order('created_at', { ascending: false })
                        .limit(5);
                    
                    console.log('Recent tips:', recentTips?.map(t => ({
                        id: t.id,
                        checkoutId: t.raw_payload?.CheckoutRequestID,
                        status: t.status,
                        created: t.created_at
                    })));
                    
                    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
                }
                
                // Get worker details separately
                const { data: worker } = await supabase
                    .from('workers')
                    .select('name, phone')
                    .eq('worker_id', tip.worker_id)
                    .single();
                
                if (!worker) {
                    console.error('❌ Worker not found for worker_id:', tip.worker_id);
                    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
                }
                
                // Calculate payout with commission
                const { workerPayout, commission, usedReferralCredit } = await calculatePayout(
                    worker.phone, 
                    amount
                );
                
                console.log('Commission calculation:', { workerPayout, commission, usedReferralCredit });
                
                // Update tip with commission info
                await supabase
                    .from('tips')
                    .update({
                        mpesa_receipt: mpesaReceiptNumber,
                        commission_amount: commission,
                        worker_payout: workerPayout,
                        used_referral_credit: usedReferralCredit,
                        raw_payload: { ...tip.raw_payload, callback: Body.stkCallback }
                    })
                    .eq('id', tip.id);
                
                // Update status separately
                const { error: statusError } = await supabase
                    .from('tips')
                    .update({ status: 'completed' })
                    .eq('id', tip.id);
                
                const updateError = statusError; // For logging compatibility
                
                if (updateError) {
                    console.error('Tip update error:', updateError);
                } else {
                    console.log('✅ Tip updated successfully');
                }
                
                // Worker stats will be updated automatically by trigger
                console.log('✅ Worker stats will be updated by trigger');
                
                // Send review request
                await sendReviewSMS(phoneNumber, worker.name, transaction.id);
                
                // Send tip notification to worker
                const { notifyTipReceived } = await import('./notifications-service.js');
                await notifyTipReceived(tip.worker_id, amount, phoneNumber);
                
                console.log(`✅ Payment processed successfully:`);
                console.log(`- Tip ID: ${tip.id}`);
                console.log(`- Worker: ${worker.name}`);
                console.log(`- Amount: ${amount}`);
                console.log(`- Worker payout: ${workerPayout}`);
                console.log(`- TTip commission: ${commission}`);
                console.log(`- M-Pesa receipt: ${mpesaReceiptNumber}`);
                
            } else {
                console.log('❌ Payment failed:', ResultDesc);
                
                // Find and update failed transaction
                const { data: transactions } = await supabase
                    .from('transactions')
                    .select('id')
                    .eq('status', 'PENDING')
                    .order('created_at', { ascending: false })
                    .limit(10);
                
                if (transactions) {
                    for (const tx of transactions) {
                        const { data: fullTx } = await supabase
                            .from('transactions')
                            .select('raw_payload')
                            .eq('id', tx.id)
                            .single();
                        
                        if (fullTx?.raw_payload?.CheckoutRequestID === CheckoutRequestID) {
                            await supabase
                                .from('transactions')
                                .update({
                                    status: 'FAILED',
                                    raw_payload: { ...fullTx.raw_payload, callback: Body.stkCallback },
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', tx.id);
                            
                            console.log(`Updated failed transaction: ${tx.id}`);
                            break;
                        }
                    }
                }
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('C2B callback error:', error);
        res.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
    }
}

// ===== PHASE 1 NEW ENDPOINTS =====

// Worker registration with referral
app.post('/api/register-worker', async (req, res) => {
    const { phone, name, occupation, referralCode } = req.body;
    
    if (!phone || !name) {
        return res.status(400).json({ error: 'Phone and name required' });
    }
    
    try {
        // Generate unique worker ID
        const workerId = 'W' + Date.now().toString(36).toUpperCase();
        
        // Create worker
        const { data: worker, error } = await supabase
            .from('workers')
            .insert({
                worker_id: workerId,
                phone: phone,
                name: name,
                occupation: occupation || 'Service Worker',
                referral_credits: 0,
                total_referrals: 0,
                average_rating: 0,
                review_count: 0
            })
            .select()
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Failed to create worker' });
        }
        
        // Process referral if provided
        if (referralCode) {
            const { data: referrer } = await supabase
                .from('workers')
                .select('phone, name')
                .eq('worker_id', referralCode)
                .single();
            
            if (referrer) {
                // Add referral record
                await supabase.from('referrals').insert({
                    referrer_phone: referrer.phone,
                    referee_phone: phone,
                    referrer_worker_id: referralCode,
                    referee_worker_id: workerId
                });
                
                // Give referrer 1 commission-free tip credit
                await supabase
                    .from('workers')
                    .update({ 
                        referral_credits: supabase.raw('referral_credits + 1'),
                        total_referrals: supabase.raw('total_referrals + 1')
                    })
                    .eq('phone', referrer.phone);
                
                logger.info('Referral processed successfully', {
                    referrer: referrer.name,
                    referee: name,
                    referralCode,
                    workerId
                });
            }
        }
        
        res.json({ 
            success: true, 
            worker, 
            workerId,
            message: referralCode ? 'Registration successful! Referral bonus applied.' : 'Registration successful!'
        });
        
    } catch (error) {
        console.error('Worker registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Referral landing page
app.get('/join/:referralCode', async (req, res) => {
    const { referralCode } = req.params;
    
    try {
        const { data: referrer } = await supabase
            .from('workers')
            .select('name, occupation, average_rating, review_count')
            .eq('worker_id', referralCode)
            .single();
        
        const referrerName = escapeHtml(referrer?.name || 'TTip Worker');
        const referrerOccupation = escapeHtml(referrer?.occupation || 'Service Worker');
        const rating = referrer?.average_rating || 0;
        const reviewCount = referrer?.review_count || 0;
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Join TTip - Referred by ${referrerName}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
                    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                    .logo { font-size: 48px; margin-bottom: 20px; }
                    .title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 10px; }
                    .subtitle { color: #666; margin-bottom: 30px; }
                    .referrer-info { background: #f8f9fa; padding: 20px; border-radius: 15px; margin-bottom: 30px; }
                    .referrer-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 5px; }
                    .referrer-occupation { color: #666; margin-bottom: 10px; }
                    .rating { color: #ffa500; }
                    .download-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; margin-bottom: 15px; }
                    .features { text-align: left; margin-top: 30px; }
                    .feature { display: flex; align-items: center; margin-bottom: 15px; }
                    .feature-icon { font-size: 24px; margin-right: 15px; }
                    .referral-code { background: #e9ecef; padding: 10px; border-radius: 8px; font-family: monospace; font-size: 16px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">⚡</div>
                    <div class="title">Join TTip</div>
                    <div class="subtitle">Start earning digital tips today!</div>
                    
                    <div class="referrer-info">
                        <div class="referrer-name">${referrerName} invited you</div>
                        <div class="referrer-occupation">${referrerOccupation}</div>
                        <div class="rating">
                            ${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}
                            ${rating.toFixed(1)} (${reviewCount} reviews)
                        </div>
                    </div>
                    
                    <a href="https://play.google.com/store/apps/details?id=com.ttip.app" class="download-btn">
                        📱 Download TTip App
                    </a>
                    
                    <div class="referral-code">
                        Referral Code: <strong>${referralCode}</strong>
                    </div>
                    
                    <div class="features">
                        <div class="feature">
                            <div class="feature-icon">💰</div>
                            <div>Earn tips instantly via M-Pesa</div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">📱</div>
                            <div>Generate your QR code</div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">⭐</div>
                            <div>Build your reputation</div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">🎁</div>
                            <div>Refer friends and earn rewards</div>
                        </div>
                    </div>
                </div>
                
                <script>
                    // Store referral code in localStorage for app to pick up
                    localStorage.setItem('ttip_referral_code', '${referralCode}');
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Referral page error:', error);
        res.status(500).send('Error loading referral page');
    }
});

// PWA Worker API endpoint
app.get('/api/worker/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker, error } = await supabase
            .from('workers')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        
        if (error || !worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        
        res.json(worker);
    } catch (error) {
        console.error('Worker API error:', error);
        res.status(500).json({ error: 'Failed to fetch worker' });
    }
});

// Get worker referral stats
app.get('/api/referral-stats/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('referral_credits, total_referrals, name')
            .eq('worker_id', workerId)
            .single();
        
        const { data: referrals } = await supabase
            .from('referrals')
            .select('referee_phone, created_at, workers!referrals_referee_phone_fkey(name)')
            .eq('referrer_worker_id', workerId)
            .order('created_at', { ascending: false });
        
        res.json({
            worker: worker?.name,
            referralCredits: worker?.referral_credits || 0,
            totalReferrals: worker?.total_referrals || 0,
            recentReferrals: referrals || []
        });
        
    } catch (error) {
        console.error('Referral stats error:', error);
        res.status(500).json({ error: 'Failed to get referral stats' });
    }
});

// Review submission page
app.get('/review/:transactionId', async (req, res) => {
    const { transactionId } = req.params;
    
    try {
        const { data: transaction } = await supabase
            .from('transactions')
            .select('*, workers(name, worker_id)')
            .eq('id', transactionId)
            .single();
        
        if (!transaction) {
            return res.status(404).send('Transaction not found');
        }
        
        const workerName = escapeHtml(transaction.workers.name);
        const csrfToken = generateCSRFToken();
        
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rate ${workerName} - TTip</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
                    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
                    .worker-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px; }
                    .stars { font-size: 40px; margin: 20px 0; }
                    .star { cursor: pointer; color: #ddd; transition: color 0.2s; }
                    .star.active, .star:hover { color: #ffa500; }
                    textarea { width: 100%; padding: 15px; margin: 20px 0; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px; box-sizing: border-box; resize: vertical; min-height: 100px; }
                    .submit-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; }
                    .message { margin-top: 20px; padding: 15px; border-radius: 10px; }
                    .success { background: #d4edda; color: #155724; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: #667eea;">⭐ Rate Your Experience</h1>
                    <div class="worker-name">How was your service with ${workerName}?</div>
                    
                    <form id="reviewForm">
                        <input type="hidden" name="csrfToken" value="${csrfToken}">
                        <div class="stars" id="starRating">
                            <span class="star" data-rating="1">⭐</span>
                            <span class="star" data-rating="2">⭐</span>
                            <span class="star" data-rating="3">⭐</span>
                            <span class="star" data-rating="4">⭐</span>
                            <span class="star" data-rating="5">⭐</span>
                        </div>
                        <textarea id="comment" placeholder="Tell others about your experience (optional)"></textarea>
                        <button type="submit" class="submit-btn">Submit Review</button>
                    </form>
                    
                    <div id="message"></div>
                </div>
                
                <script>
                    let selectedRating = 0;
                    
                    document.querySelectorAll('.star').forEach(star => {
                        star.addEventListener('click', (e) => {
                            selectedRating = parseInt(e.target.dataset.rating);
                            updateStars();
                        });
                    });
                    
                    function updateStars() {
                        document.querySelectorAll('.star').forEach((star, index) => {
                            star.classList.toggle('active', index < selectedRating);
                        });
                    }
                    
                    document.getElementById('reviewForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        if (selectedRating === 0) {
                            alert('Please select a rating');
                            return;
                        }
                        
                        const comment = document.getElementById('comment').value;
                        const csrfToken = document.querySelector('input[name="csrfToken"]').value;
                        
                        try {
                            const response = await fetch('/api/submit-review', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'X-CSRF-Token': csrfToken
                                },
                                body: JSON.stringify({ 
                                    transactionId: '${transactionId}',
                                    rating: selectedRating,
                                    comment: comment
                                })
                            });
                            
                            const result = await response.json();
                            
                            if (result.success) {
                                document.getElementById('message').innerHTML = 
                                    '<div class="message success">✅ Thank you for your review!</div>';
                                document.getElementById('reviewForm').style.display = 'none';
                            } else {
                                alert('Failed to submit review: ' + result.error);
                            }
                        } catch (error) {
                            alert('Network error. Please try again.');
                        }
                    });
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Review page error:', error);
        res.status(500).send('Error loading review page');
    }
});

// Submit customer review
app.post('/api/submit-review', csrfProtection, async (req, res) => {
    const { transactionId, rating, comment } = req.body;
    
    if (!transactionId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Valid transaction ID and rating (1-5) required' });
    }
    
    try {
        // Get transaction details
        const { data: transaction } = await supabase
            .from('transactions')
            .select('worker_id')
            .eq('id', transactionId)
            .single();
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        // Check if review already exists
        const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('transaction_id', transactionId)
            .single();
        
        if (existingReview) {
            return res.status(409).json({ error: 'Review already submitted' });
        }
        
        // Insert review
        await supabase.from('reviews').insert({
            transaction_id: transactionId,
            worker_id: transaction.worker_id,
            rating: rating,
            comment: comment || null
        });
        
        // Update worker's average rating
        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('worker_id', transaction.worker_id);
        
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        await supabase
            .from('workers')
            .update({ 
                average_rating: Math.round(avgRating * 10) / 10,
                review_count: reviews.length 
            })
            .eq('worker_id', transaction.worker_id);
        
        res.json({ success: true, message: 'Review submitted successfully' });
        
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Submit customer review
app.post('/reviews', async (req, res) => {
    const { transactionId, workerId, rating, comment } = req.body;
    
    if (!transactionId || !workerId || !rating) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    try {
        const success = await submitCustomerReview(transactionId, workerId, rating, comment);
        
        if (success) {
            res.json({ success: true, message: 'Review submitted successfully' });
        } else {
            res.status(500).json({ error: 'Failed to submit review' });
        }
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Create team
app.post('/teams', async (req, res) => {
    const { name, ownerId } = req.body;
    
    if (!name || !ownerId) {
        return res.status(400).json({ error: 'Team name and owner ID required' });
    }
    
    try {
        const team = await createTeam(name, ownerId);
        
        if (team) {
            res.json({ success: true, team });
        } else {
            res.status(500).json({ error: 'Failed to create team' });
        }
    } catch (error) {
        console.error('Team creation error:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});

// Invite worker to team
app.post('/teams/:id/invite', async (req, res) => {
    const { id: teamId } = req.params;
    const { phone, inviterName } = req.body;
    
    if (!phone || !inviterName) {
        return res.status(400).json({ error: 'Phone and inviter name required' });
    }
    
    try {
        const result = await inviteWorkerToTeam(teamId, phone, inviterName);
        
        if (result) {
            res.json({ success: true, message: 'Invite sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send invite' });
        }
    } catch (error) {
        console.error('Team invite error:', error);
        res.status(500).json({ error: 'Failed to send invite' });
    }
});

// Accept team invite
app.post('/teams/accept', async (req, res) => {
    const { token, workerId } = req.body;
    
    if (!token || !workerId) {
        return res.status(400).json({ error: 'Token and worker ID required' });
    }
    
    try {
        const result = await acceptTeamInvite(token, workerId);
        res.json(result);
    } catch (error) {
        console.error('Team accept error:', error);
        res.status(500).json({ error: 'Failed to accept invite' });
    }
});

// Get team stats
app.get('/teams/:id/stats', async (req, res) => {
    const { id: teamId } = req.params;
    
    try {
        const stats = await getTeamStats(teamId);
        
        if (stats) {
            res.json(stats);
        } else {
            res.status(404).json({ error: 'Team not found' });
        }
    } catch (error) {
        console.error('Team stats error:', error);
        res.status(500).json({ error: 'Failed to get team stats' });
    }
});

// Get worker notifications (requires authentication)
app.get('/notifications/:workerPhone', csrfProtection, async (req, res) => {
    const { workerPhone } = req.params;
    const { limit = 20 } = req.query;
    
    try {
        const notifications = await getWorkerNotifications(workerPhone, parseInt(limit));
        res.json({ notifications });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark notification as read (requires authentication)
app.put('/notifications/:id/read', csrfProtection, async (req, res) => {
    const { id } = req.params;
    
    try {
        await markNotificationRead(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Get commission stats (admin)
app.get('/api/commission-stats', adminLimiter, requireAdminAuth, async (req, res) => {
    try {
        const { data: stats } = await supabase
            .from('transactions')
            .select('commission_amount, worker_payout, amount, created_at')
            .eq('status', 'COMPLETED')
            .not('commission_amount', 'is', null);
        
        const totalCommission = stats.reduce((sum, t) => sum + (t.commission_amount || 0), 0);
        const totalPayouts = stats.reduce((sum, t) => sum + (t.worker_payout || 0), 0);
        const totalVolume = stats.reduce((sum, t) => sum + (t.amount || 0), 0);
        
        res.json({
            totalCommission,
            totalPayouts,
            totalVolume,
            transactionCount: stats.length,
            averageCommission: stats.length > 0 ? totalCommission / stats.length : 0
        });
        
    } catch (error) {
        console.error('Commission stats error:', error);
        res.status(500).json({ error: 'Failed to get commission stats' });
    }
});

// ===== PHASE 2 ENDPOINTS =====

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('id, worker_id, name, occupation, total_tips, tip_count, profile_photo_url')
            .order('total_tips', { ascending: false })
            .limit(20);
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
        
        res.json({ workers: workers || [] });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// API tip route for mobile app
app.get('/api/tip/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: worker } = await supabase
            .from('workers')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        
        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        
        res.json({ 
            success: true,
            worker,
            paymentUrl: `https://ttip-backend.onrender.com/pay/${workerId}`,
            message: 'Worker found'
        });
        
    } catch (error) {
        console.error('API tip error:', error);
        res.status(500).json({ error: 'Failed to get worker info' });
    }
});

// Get all workers for dropdown
app.get('/api/workers', async (req, res) => {
    try {
        const { data: workers, error } = await supabase
            .from('workers')
            .select('worker_id, name, occupation, total_tips, tip_count, profile_photo_url')
            .order('name');
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch workers' });
        }
        
        res.json({ workers: workers || [] });
        
    } catch (error) {
        console.error('Workers fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch workers' });
    }
});

// Analytics Dashboard
app.get('/api/analytics/:workerId', async (req, res) => {
    const { workerId } = req.params;
    const { period = '30' } = req.query;
    
    try {
        // Get comprehensive analytics
        const { data: analytics } = await supabase
            .from('analytics_dashboard')
            .select('*')
            .eq('worker_id', workerId)
            .single();
        
        // Get performance metrics for the period
        const { data: performance } = await supabase
            .from('performance_metrics')
            .select('*')
            .eq('worker_id', workerId)
            .gte('date', new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date', { ascending: false });
        
        // Get customer insights
        const { data: customers } = await supabase
            .from('customer_insights')
            .select('*')
            .eq('worker_id', workerId)
            .order('total_tips_given', { ascending: false })
            .limit(10);
        
        // Calculate peak hours from transactions
        const { data: hourlyData } = await supabase
            .from('transactions')
            .select('created_at')
            .eq('worker_id', workerId)
            .eq('status', 'COMPLETED')
            .gte('created_at', new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toISOString());
        
        const hourlyStats = {};
        hourlyData?.forEach(tx => {
            const hour = new Date(tx.created_at).getHours();
            hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
        });
        
        const peakHour = Object.keys(hourlyStats).reduce((a, b) => 
            hourlyStats[a] > hourlyStats[b] ? a : b, '12');
        
        res.json({
            analytics: analytics || {},
            performance: performance || [],
            topCustomers: customers || [],
            peakHour: parseInt(peakHour),
            hourlyDistribution: hourlyStats
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Earnings Forecast
app.get('/api/forecast/:workerId', async (req, res) => {
    const { workerId } = req.params;
    const { days = '30' } = req.query;
    
    try {
        // Get historical data for prediction
        const { data: historical } = await supabase
            .from('performance_metrics')
            .select('date, total_earnings')
            .eq('worker_id', workerId)
            .order('date', { ascending: false })
            .limit(90);
        
        if (!historical || historical.length < 7) {
            return res.json({ 
                forecast: [],
                message: 'Insufficient data for accurate forecasting. Need at least 7 days of data.'
            });
        }
        
        // Simple moving average prediction
        const recentEarnings = historical.slice(0, 7).map(h => parseFloat(h.total_earnings) || 0);
        const avgDailyEarnings = recentEarnings.reduce((a, b) => a + b, 0) / recentEarnings.length;
        
        // Generate forecast
        const forecast = [];
        const forecastDays = parseInt(days);
        
        for (let i = 1; i <= forecastDays; i++) {
            const forecastDate = new Date();
            forecastDate.setDate(forecastDate.getDate() + i);
            
            // Add some variance based on day of week
            const dayOfWeek = forecastDate.getDay();
            const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.2 : 1.0;
            const predictedEarnings = Math.round(avgDailyEarnings * weekendMultiplier);
            
            forecast.push({
                date: forecastDate.toISOString().split('T')[0],
                predicted_earnings: predictedEarnings,
                confidence_level: Math.max(60, 90 - (i * 2)) // Decreasing confidence over time
            });
        }
        
        // Store forecast in database
        await supabase
            .from('earnings_forecast')
            .upsert(forecast.map(f => ({
                worker_id: workerId,
                forecast_date: f.date,
                predicted_earnings: f.predicted_earnings,
                confidence_level: f.confidence_level,
                factors: { method: 'moving_average', historical_days: 7 }
            })), { onConflict: 'worker_id,forecast_date' });
        
        res.json({ forecast, avgDailyEarnings });
        
    } catch (error) {
        console.error('Forecast error:', error);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

// Recurring Tips Setup
app.post('/api/recurring-tips', async (req, res) => {
    const { customerPhone, workerId, amount, frequency } = req.body;
    
    if (!customerPhone || !workerId || !amount || !frequency) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
        // Calculate next payment date
        const nextPaymentDate = new Date();
        switch (frequency) {
            case 'weekly':
                nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
                break;
            case 'monthly':
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                break;
            case 'quarterly':
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
                break;
        }
        
        const { data, error } = await supabase
            .from('recurring_tips')
            .insert({
                customer_phone: customerPhone,
                worker_id: workerId,
                amount: amount,
                frequency: frequency,
                next_payment_date: nextPaymentDate.toISOString().split('T')[0],
                status: 'active'
            })
            .select()
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Failed to setup recurring tip' });
        }
        
        res.json({ success: true, recurringTip: data });
        
    } catch (error) {
        console.error('Recurring tips error:', error);
        res.status(500).json({ error: 'Failed to setup recurring tip' });
    }
});

// Customer Feedback
app.post('/api/feedback', async (req, res) => {
    const { workerId, customerPhone, feedbackType, rating, message } = req.body;
    
    if (!workerId || !feedbackType) {
        return res.status(400).json({ error: 'Worker ID and feedback type required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('customer_feedback')
            .insert({
                worker_id: workerId,
                customer_phone: customerPhone,
                feedback_type: feedbackType,
                rating: rating,
                message: message,
                status: 'new'
            })
            .select()
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Failed to submit feedback' });
        }
        
        res.json({ success: true, feedback: data });
        
    } catch (error) {
        console.error('Feedback error:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// Marketing Campaigns
app.get('/api/campaigns/active', async (req, res) => {
    try {
        const { data: campaigns } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .eq('status', 'active')
            .lte('start_date', new Date().toISOString().split('T')[0])
            .gte('end_date', new Date().toISOString().split('T')[0]);
        
        res.json({ campaigns: campaigns || [] });
        
    } catch (error) {
        console.error('Campaigns error:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// Tax Report Generation
app.get('/api/tax-report/:workerId/:year/:month?', async (req, res) => {
    const { workerId, year, month } = req.params;
    
    try {
        // Get transactions for the period
        let startDate, endDate;
        
        if (month) {
            startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            endDate = new Date(parseInt(year), parseInt(month), 0);
        } else {
            startDate = new Date(parseInt(year), 0, 1);
            endDate = new Date(parseInt(year), 11, 31);
        }
        
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('worker_id', workerId)
            .eq('status', 'COMPLETED')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        
        const totalEarnings = transactions?.reduce((sum, tx) => sum + parseFloat(tx.worker_payout || 0), 0) || 0;
        const totalTips = transactions?.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0) || 0;
        const commissionPaid = transactions?.reduce((sum, tx) => sum + parseFloat(tx.commission_amount || 0), 0) || 0;
        
        const reportData = {
            period: month ? `${year}-${month.padStart(2, '0')}` : year,
            transactions: transactions?.length || 0,
            totalEarnings,
            totalTips,
            commissionPaid,
            averageTip: transactions?.length ? totalTips / transactions.length : 0,
            taxableIncome: totalEarnings,
            generatedAt: new Date().toISOString()
        };
        
        // Store report
        await supabase
            .from('tax_reports')
            .upsert({
                worker_id: workerId,
                report_period: reportData.period,
                year: parseInt(year),
                month: month ? parseInt(month) : null,
                total_earnings: totalEarnings,
                total_tips: totalTips,
                commission_paid: commissionPaid,
                report_data: reportData
            }, { onConflict: 'worker_id,year,month' });
        
        res.json({ success: true, report: reportData });
        
    } catch (error) {
        console.error('Tax report error:', error);
        res.status(500).json({ error: 'Failed to generate tax report' });
    }
});

// Push Notification Scheduling
app.post('/api/notifications/schedule', adminLimiter, requireAdminAuth, async (req, res) => {
    const { workerId, customerPhone, title, message, notificationType, scheduledFor } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('push_notifications')
            .insert({
                worker_id: workerId,
                customer_phone: customerPhone,
                title: title,
                message: message,
                notification_type: notificationType,
                scheduled_for: scheduledFor || new Date().toISOString(),
                status: 'pending'
            })
            .select()
            .single();
        
        if (error) {
            return res.status(500).json({ error: 'Failed to schedule notification' });
        }
        
        res.json({ success: true, notification: data });
        
    } catch (error) {
        console.error('Notification scheduling error:', error);
        res.status(500).json({ error: 'Failed to schedule notification' });
    }
});

// ===== PHASE 3 ENDPOINTS =====

// Marketplace - Discover Workers
app.get('/api/marketplace/workers', async (req, res) => {
    const { category, location, radius = 5000, rating = 0, limit = 20 } = req.query;
    
    try {
        let query = supabase
            .from('workers')
            .select(`
                worker_id, name, occupation, average_rating, review_count, total_tips,
                worker_profiles(bio, skills, hourly_rate, is_verified, is_featured, location_lat, location_lng),
                worker_services(service_name, description, price_range)
            `)
            .gte('average_rating', rating)
            .limit(parseInt(limit));
        
        if (category) {
            query = query.eq('worker_services.service_categories.name', category);
        }
        
        const { data: workers, error } = await query;
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch workers' });
        }
        
        res.json({ workers: workers || [] });
        
    } catch (error) {
        console.error('Marketplace error:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace data' });
    }
});

// Worker Profile
app.get('/api/workers/:workerId/profile', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const { data: profile, error } = await supabase
            .from('workers')
            .select(`
                *, 
                worker_profiles(*),
                worker_services(*, service_categories(name, icon, color)),
                reviews(rating, comment, created_at, helpful_votes, is_verified),
                user_achievements(*, achievement_badges(badge_name, description, icon, rarity))
            `)
            .eq('worker_id', workerId)
            .single();
        
        if (error || !profile) {
            return res.status(404).json({ error: 'Worker not found' });
        }
        
        // Increment profile views
        await supabase
            .from('worker_profiles')
            .update({ profile_views: supabase.raw('profile_views + 1') })
            .eq('worker_id', workerId);
        
        res.json({ profile });
        
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Follow/Unfollow Worker
app.post('/api/workers/:workerId/follow', async (req, res) => {
    const { workerId } = req.params;
    const { customerPhone, action } = req.body; // action: 'follow' or 'unfollow'
    
    try {
        if (action === 'follow') {
            const { error } = await supabase
                .from('worker_followers')
                .insert({ worker_id: workerId, follower_phone: customerPhone });
            
            if (error && error.code !== '23505') { // Ignore duplicate key error
                return res.status(500).json({ error: 'Failed to follow worker' });
            }
        } else {
            await supabase
                .from('worker_followers')
                .delete()
                .eq('worker_id', workerId)
                .eq('follower_phone', customerPhone);
        }
        
        // Get updated follower count
        const { count } = await supabase
            .from('worker_followers')
            .select('*', { count: 'exact' })
            .eq('worker_id', workerId);
        
        res.json({ success: true, followers: count, action });
        
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ error: 'Failed to update follow status' });
    }
});

// Loyalty Points
app.get('/api/loyalty/:customerPhone', async (req, res) => {
    const { customerPhone } = req.params;
    
    try {
        const { data: loyalty } = await supabase
            .from('loyalty_points')
            .select('*')
            .eq('customer_phone', customerPhone)
            .single();
        
        const { data: rewards } = await supabase
            .from('loyalty_rewards')
            .select('*')
            .eq('is_active', true)
            .order('points_required');
        
        res.json({ 
            loyalty: loyalty || { current_balance: 0, tier_level: 'bronze' },
            availableRewards: rewards || []
        });
        
    } catch (error) {
        console.error('Loyalty error:', error);
        res.status(500).json({ error: 'Failed to fetch loyalty data' });
    }
});

// Award Points
app.post('/api/loyalty/award', async (req, res) => {
    const { customerPhone, workerId, points, reason } = req.body;
    
    try {
        // Update or create loyalty record
        const { data: existing } = await supabase
            .from('loyalty_points')
            .select('*')
            .eq('customer_phone', customerPhone)
            .single();
        
        if (existing) {
            await supabase
                .from('loyalty_points')
                .update({
                    points_earned: existing.points_earned + points,
                    current_balance: existing.current_balance + points,
                    last_activity: new Date().toISOString()
                })
                .eq('customer_phone', customerPhone);
        } else {
            await supabase
                .from('loyalty_points')
                .insert({
                    customer_phone: customerPhone,
                    worker_id: workerId,
                    points_earned: points,
                    current_balance: points
                });
        }
        
        res.json({ success: true, pointsAwarded: points, reason });
        
    } catch (error) {
        console.error('Award points error:', error);
        res.status(500).json({ error: 'Failed to award points' });
    }
});

// Leaderboards
app.get('/api/leaderboards/:type/:period', async (req, res) => {
    const { type, period } = req.params;
    const { limit = 10 } = req.query;
    
    try {
        const { data: leaderboard, error } = await supabase
            .from('leaderboards')
            .select(`
                *, 
                workers(name, occupation, average_rating, worker_profiles(is_verified))
            `)
            .eq('leaderboard_type', type)
            .eq('period', period)
            .order('rank_position')
            .limit(parseInt(limit));
        
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
        
        res.json({ leaderboard: leaderboard || [] });
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// User Achievements
app.get('/api/achievements/:userId/:userType', async (req, res) => {
    const { userId, userType } = req.params;
    
    try {
        const { data: achievements } = await supabase
            .from('user_achievements')
            .select(`
                *, 
                achievement_badges(badge_name, description, icon, rarity, points_reward)
            `)
            .eq('user_id', userId)
            .eq('user_type', userType)
            .order('earned_at', { ascending: false });
        
        res.json({ achievements: achievements || [] });
        
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Check and Award Achievements
app.post('/api/achievements/check', async (req, res) => {
    const { userId, userType, stats } = req.body;
    
    try {
        // Get all available badges for user type
        const { data: badges } = await supabase
            .from('achievement_badges')
            .select('*')
            .eq('badge_type', userType)
            .eq('is_active', true);
        
        const newAchievements = [];
        
        for (const badge of badges) {
            // Check if user already has this badge
            const { data: existing } = await supabase
                .from('user_achievements')
                .select('id')
                .eq('user_id', userId)
                .eq('badge_id', badge.id)
                .single();
            
            if (!existing) {
                // Check if criteria is met
                const criteria = badge.criteria;
                let criteriamet = true;
                
                for (const [key, value] of Object.entries(criteria)) {
                    if (!stats[key] || stats[key] < value) {
                        criteriamet = false;
                        break;
                    }
                }
                
                if (criteriamet) {
                    // Award achievement
                    await supabase
                        .from('user_achievements')
                        .insert({
                            user_id: userId,
                            user_type: userType,
                            badge_id: badge.id
                        });
                    
                    newAchievements.push(badge);
                }
            }
        }
        
        res.json({ newAchievements });
        
    } catch (error) {
        console.error('Achievement check error:', error);
        res.status(500).json({ error: 'Failed to check achievements' });
    }
});

// Service Categories
app.get('/api/categories', async (req, res) => {
    try {
        const { data: categories } = await supabase
            .from('service_categories')
            .select('*')
            .eq('is_active', true)
            .order('name');
        
        res.json({ categories: categories || [] });
        
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ===== ADMIN ENDPOINTS (Enhanced) =====

app.get('/admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'admin-dashboard.html'));
});

app.get('/analytics-dashboard.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'analytics-dashboard.html'));
});

app.get('/marketplace-dashboard.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'marketplace-dashboard.html'));
});

app.get('/admin/queue-status', adminLimiter, requireAdminAuth, (req, res) => {
    res.json(getQueueStatus());
});

app.get('/admin/transactions', adminLimiter, requireAdminAuth, async (req, res) => {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                *,
                workers(name, phone),
                payouts(status, daraja_response),
                reviews(rating, comment)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        res.json({ transactions });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

app.post('/admin/retry/:txId', adminLimiter, requireAdminAuth, async (req, res) => {
    const { txId } = req.params;
    
    try {
        const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', txId)
            .single();
        
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const jobId = await enqueuePayout(
            transaction.id,
            transaction.worker_id,
            transaction.amount,
            transaction.customer_number
        );
        
        res.json({ success: true, jobId });
    } catch (error) {
        console.error('Retry payout error:', error);
        res.status(500).json({ error: 'Failed to retry payout' });
    }
});

// Payment status check
app.get('/api/payment-status', async (req, res) => {
    const { checkoutRequestId } = req.query;
    
    try {
        console.log(`Checking payment status for CheckoutRequestID: ${checkoutRequestId}`);
        
        // Get recent transactions and search through them
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('id, status, amount, worker_id, created_at, raw_payload, mpesa_tx_id')
            .order('created_at', { ascending: false })
            .limit(50);
        
        let transaction = null;
        
        if (transactions) {
            for (const tx of transactions) {
                const rawPayload = tx.raw_payload;
                if (rawPayload && 
                    (rawPayload.CheckoutRequestID === checkoutRequestId ||
                     JSON.stringify(rawPayload).includes(checkoutRequestId))) {
                    transaction = tx;
                    console.log(`Found transaction ${tx.id} with status: ${tx.status}`);
                    break;
                }
            }
        }
        
        if (!transaction) {
            console.log(`No transaction found for CheckoutRequestID: ${checkoutRequestId}`);
        }
        
        // Consider transaction completed if it has M-Pesa TX ID (workaround for status update issue)
        let effectiveStatus = transaction?.status || 'PENDING';
        if (transaction?.mpesa_tx_id && effectiveStatus === 'PENDING') {
            effectiveStatus = 'COMPLETED';
        }
        
        // If still pending after 30 seconds, try querying M-Pesa directly
        if (effectiveStatus === 'PENDING' && transaction) {
            const transactionAge = Date.now() - new Date(transaction.created_at).getTime();
            if (transactionAge > 30000) { // 30 seconds
                try {
                    // Try to import and use query function
                    const { queryPaymentStatus } = await import('./enhanced-daraja.mjs');
                    const queryResult = await queryPaymentStatus(checkoutRequestId);
                    
                    if (queryResult.status === 'SUCCESS') {
                        // Update transaction immediately
                        await supabase
                            .from('transactions')
                            .update({ 
                                mpesa_tx_id: 'QUERY_SUCCESS',
                                commission_amount: 0,
                                worker_payout: transaction.amount
                            })
                            .eq('id', transaction.id);
                        
                        effectiveStatus = 'COMPLETED';
                    } else if (queryResult.status === 'FAILED') {
                        effectiveStatus = 'FAILED';
                    }
                    // If still PENDING from query, keep checking
                } catch (queryError) {
                    console.log('Query failed:', queryError.message);
                }
            }
        }
        
        res.json({ 
            status: effectiveStatus,
            transaction: transaction ? {
                id: transaction.id,
                status: effectiveStatus,
                amount: transaction.amount,
                created_at: transaction.created_at,
                mpesa_tx_id: transaction.mpesa_tx_id
            } : null
        });
    } catch (error) {
        console.error('Payment status error:', error);
        res.json({ status: 'PENDING' });
    }
});

// Debug endpoint to check recent transactions
app.get('/debug/transactions', async (req, res) => {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('id, worker_id, amount, status, created_at, raw_payload')
            .order('created_at', { ascending: false })
            .limit(10);
        
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        phase: 'Phase 1 - Commission & Referrals'
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`TTip Phase 3 Server running on port ${PORT}`);
    console.log('Phase 1: Commission System, Referral Program, Review System');
    console.log('Phase 2: Analytics, Forecasting, Recurring Tips, Marketing');
    console.log('Phase 3: Marketplace, Social Features, Loyalty, Gamification');
    console.log('📊 Analytics Dashboard: https://ttip-app.onrender.com/analytics-dashboard.html');
    console.log('🏪 Marketplace: https://ttip-app.onrender.com/marketplace-dashboard.html');
    console.log('Ready for testing!');
});