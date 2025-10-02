import express from 'express';
import cors from 'cors';
import path from 'path';
import { configDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { initiateMpesaPayment } from './enhanced-daraja.mjs';
import { generateQRCode, getWorkerQR } from './qr-service.js';
import { enqueuePayout, getQueueStatus } from './payment-queue.js';
import { processCompletedTransaction, submitCustomerReview } from './reviews-service.js';
import { createTeam, inviteWorkerToTeam, acceptTeamInvite, getTeamStats } from './teams-service.js';
import { sendNotification, notifyTipReceived, getWorkerNotifications, markNotificationRead } from './notifications-service.js';
import { requireAdminAuth } from './admin-auth.js';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import crypto from 'crypto';

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

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.use(express.json({ limit: '1mb' })); // Reduced from 10mb
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
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
                    .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; }
                    .worker-info { background: #f8f9fa; padding: 20px; border-radius: 15px; margin-bottom: 20px; text-align: center; }
                    .worker-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 5px; }
                    .worker-occupation { color: #666; font-size: 16px; margin-bottom: 10px; }
                    .rating { color: #ffa500; font-size: 18px; }
                    .stars { color: #ffa500; }
                    input { width: 100%; padding: 15px; margin: 10px 0; border: 2px solid #e9ecef; border-radius: 12px; font-size: 16px; box-sizing: border-box; }
                    input:focus { outline: none; border-color: #667eea; }
                    .pay-btn { width: 100%; padding: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer; transition: transform 0.2s; }
                    .pay-btn:hover { transform: translateY(-2px); }
                    .pay-btn:disabled { opacity: 0.6; transform: none; cursor: not-allowed; }
                    .message { margin-top: 20px; padding: 15px; border-radius: 10px; text-align: center; }
                    .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
                    .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
                    .loading { background: #e2e3e5; color: #383d41; border: 1px solid #d6d8db; }
                    .spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 10px; }
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="color: #667eea; margin: 0;">⚡ TTip</h1>
                        <p style="color: #666; margin: 5px 0 0 0;">Quick & Secure Tipping</p>
                    </div>
                    
                    <div class="worker-info">
                        <div class="worker-name">${workerName}</div>
                        <div class="worker-occupation">${workerOccupation}</div>
                        <div class="rating">
                            <span class="stars">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}</span>
                            ${rating.toFixed(1)} (${reviewCount} reviews)
                        </div>
                    </div>
                    
                    <form id="paymentForm">
                        <input type="hidden" name="csrfToken" value="${csrfToken}">
                        <input type="number" id="amount" name="amount" placeholder="Enter tip amount (KSh)" min="1" max="70000" required>
                        <input type="tel" id="phone" name="phone" placeholder="Your phone number (0712345678)" required>
                        <button type="submit" class="pay-btn" id="payBtn">Send Tip 💰</button>
                    </form>
                    
                    <div id="message"></div>
                </div>
                
                <script>
                    document.getElementById('paymentForm').addEventListener('submit', async (e) => {
                        e.preventDefault();
                        
                        const formData = new FormData(e.target);
                        const amount = formData.get('amount');
                        const phone = formData.get('phone');
                        const csrfToken = formData.get('csrfToken');
                        
                        const btn = document.getElementById('payBtn');
                        const msg = document.getElementById('message');
                        
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner"></span>Processing...';
                        msg.innerHTML = '<div class="message loading">Initiating payment...</div>';
                        
                        try {
                            const response = await fetch('/api/stk-push', {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'X-CSRF-Token': csrfToken
                                },
                                body: JSON.stringify({ 
                                    workerId: '${workerId}', 
                                    amount: parseFloat(amount), 
                                    customerPhone: phone 
                                })
                            });
                            
                            const result = await response.json();
                            
                            if (result.success) {
                                msg.innerHTML = '<div class="message success">✅ STK Push sent! Check your phone to complete payment.</div>';
                                
                                let attempts = 0;
                                const maxAttempts = 60;
                                
                                const checkStatus = setInterval(async () => {
                                    attempts++;
                                    
                                    try {
                                        const statusResponse = await fetch('/api/payment-status?checkoutRequestId=' + result.checkoutRequestId);
                                        const statusData = await statusResponse.json();
                                        
                                        if (statusData.status === 'COMPLETED') {
                                            clearInterval(checkStatus);
                                            msg.innerHTML = '<div class="message success">🎉 Payment successful! Tip sent to ${workerName}. Thank you!</div>';
                                            btn.innerHTML = 'Payment Complete ✅';
                                            btn.style.background = '#28a745';
                                        } else if (statusData.status === 'FAILED') {
                                            clearInterval(checkStatus);
                                            msg.innerHTML = '<div class="message error">❌ Payment failed. Please try again.</div>';
                                            btn.disabled = false;
                                            btn.innerHTML = 'Send Tip 💰';
                                        }
                                    } catch (error) {
                                        console.log('Status check error:', error);
                                    }
                                    
                                    if (attempts >= maxAttempts) {
                                        clearInterval(checkStatus);
                                        msg.innerHTML = '<div class="message error">⏱️ Payment timeout. Please contact support if money was deducted.</div>';
                                        btn.disabled = false;
                                        btn.innerHTML = 'Send Tip 💰';
                                    }
                                }, 2000);
                                
                            } else {
                                msg.innerHTML = '<div class="message error">❌ ' + (result.error || 'Payment failed') + '</div>';
                                btn.disabled = false;
                                btn.innerHTML = 'Send Tip 💰';
                            }
                        } catch (error) {
                            msg.innerHTML = '<div class="message error">❌ Network error. Please try again.</div>';
                            btn.disabled = false;
                            btn.innerHTML = 'Send Tip 💰';
                        }
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
    
    // Check for duplicate transactions (idempotency)
    const formattedPhone = customerPhone.startsWith('0') ? '254' + customerPhone.substring(1) : customerPhone;
    const recentTransaction = await supabase
        .from('transactions')
        .select('id')
        .eq('worker_id', workerId)
        .eq('customer_number', formattedPhone)
        .eq('amount', amount)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .single();
    
    if (recentTransaction.data) {
        return res.status(409).json({ success: false, error: 'Duplicate transaction detected' });
    }
    
    next();
};

// STK Push initiation (enhanced)
app.post('/api/stk-push', stkPushLimiter, csrfProtection, validateSTKPush, async (req, res) => {
    const { workerId, amount, customerPhone } = req.body;
    
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
        
        const stkResponse = await initiateMpesaPayment(formattedPhone, amount, workerId);
        
        if (stkResponse.ResponseCode === '0') {
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    worker_id: workerId,
                    customer_number: formattedPhone,
                    amount: amount,
                    status: 'PENDING',
                    gateway: 'daraja',
                    raw_payload: stkResponse
                });
            
            if (txError) console.error('Transaction record error:', txError);
            
            res.json({ 
                success: true, 
                checkoutRequestId: stkResponse.CheckoutRequestID,
                message: 'STK Push sent successfully'
            });
        } else {
            res.json({ 
                success: false, 
                error: stkResponse.ResponseDescription || 'STK Push failed'
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
app.post('/mpesa/c2b-callback', async (req, res) => {
    console.log('=== C2B CALLBACK RECEIVED ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { Body } = req.body;
        
        if (Body?.stkCallback) {
            const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
            
            if (ResultCode === 0) {
                const metadata = CallbackMetadata?.Item || [];
                const amount = metadata.find(item => item.Name === 'Amount')?.Value;
                const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
                
                const { data: transaction, error: txError } = await supabase
                    .from('transactions')
                    .select('*, workers(name, phone)')
                    .eq('raw_payload->CheckoutRequestID', CheckoutRequestID)
                    .single();
                
                if (txError || !transaction) {
                    console.error('Transaction not found:', CheckoutRequestID);
                    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
                }
                
                // Calculate payout with commission
                const { workerPayout, commission, usedReferralCredit } = await calculatePayout(
                    transaction.workers.phone, 
                    amount
                );
                
                // Update transaction with commission info
                await supabase
                    .from('transactions')
                    .update({
                        mpesa_tx_id: mpesaReceiptNumber,
                        status: 'COMPLETED',
                        commission_amount: commission,
                        worker_payout: workerPayout,
                        used_referral_credit: usedReferralCredit,
                        raw_payload: { ...transaction.raw_payload, callback: Body.stkCallback },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);
                
                // Update worker stats
                await supabase
                    .from('workers')
                    .update({
                        total_tips: supabase.raw(`total_tips + ${workerPayout}`),
                        tip_count: supabase.raw('tip_count + 1')
                    })
                    .eq('worker_id', transaction.worker_id);
                
                // Send review request
                await sendReviewSMS(phoneNumber, transaction.workers.name, transaction.id);
                
                console.log(`Payment processed: Worker gets ${workerPayout}, TTip commission: ${commission}`);
                
            } else {
                console.log('Payment failed:', ResultDesc);
                await supabase
                    .from('transactions')
                    .update({
                        status: 'FAILED',
                        raw_payload: Body.stkCallback,
                        updated_at: new Date().toISOString()
                    })
                    .eq('raw_payload->CheckoutRequestID', CheckoutRequestID);
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('C2B callback error:', error);
        res.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
    }
});

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
            .select('worker_id, name, occupation, total_tips, tip_count')
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
        const { data: transaction } = await supabase
            .from('transactions')
            .select('status, amount, worker_id')
            .eq('raw_payload->CheckoutRequestID', checkoutRequestId)
            .single();
        
        res.json({ 
            status: transaction?.status || 'PENDING',
            transaction 
        });
    } catch (error) {
        console.error('Payment status error:', error);
        res.json({ status: 'PENDING' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TTip Phase 3 Server running on port ${PORT}`);
    console.log('Phase 1: Commission System, Referral Program, Review System');
    console.log('Phase 2: Analytics, Forecasting, Recurring Tips, Marketing');
    console.log('Phase 3: Marketplace, Social Features, Loyalty, Gamification');
    console.log('📊 Analytics Dashboard: http://localhost:3000/analytics-dashboard.html');
    console.log('🏪 Marketplace: http://localhost:3000/marketplace-dashboard.html');
    console.log('Ready for testing!');
});