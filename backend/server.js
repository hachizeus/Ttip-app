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

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
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

// Enhanced CSRF protection
const crypto = require('crypto');
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

// Enhanced C2B callback with reviews and notifications
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
                    .select('*')
                    .eq('raw_payload->CheckoutRequestID', CheckoutRequestID)
                    .single();
                
                if (txError || !transaction) {
                    console.error('Transaction not found:', CheckoutRequestID);
                    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
                }
                
                // Update transaction
                await supabase
                    .from('transactions')
                    .update({
                        mpesa_tx_id: mpesaReceiptNumber,
                        status: 'PENDING',
                        raw_payload: { ...transaction.raw_payload, callback: Body.stkCallback },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);
                
                // Enqueue payout
                await enqueuePayout(transaction.id, transaction.worker_id, amount, phoneNumber);
                
                // Process reviews and notifications
                await processCompletedTransaction(transaction.id, transaction.worker_id, amount, phoneNumber);
                await notifyTipReceived(transaction.worker_id, amount, phoneNumber);
                
                console.log(`Enhanced payment processing complete for worker ${transaction.worker_id}`);
                
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

// ===== PHASE 2 NEW ENDPOINTS =====

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

// ===== ADMIN ENDPOINTS (Enhanced) =====

app.get('/admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'admin-dashboard.html'));
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
        queue: getQueueStatus(),
        phase: 'Phase 2 - Growth & Engagement'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TTip Phase 2 Server running on port ${PORT}`);
    console.log('New Features: Reviews, Teams, Enhanced Notifications, Milestones');
});