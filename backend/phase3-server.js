import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import { configDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

// Phase 3 Services
import { PaymentGatewayService } from './services/payment-gateway.js';
import { SecurityService } from './services/security.js';
import { FraudDetectionService } from './services/fraud-detection.js';
import { USSDService } from './services/ussd.js';
import { MonitoringService } from './services/monitoring.js';
import { AnalyticsService } from './services/analytics.js';

configDotenv();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Initialize services
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const paymentGateway = new PaymentGatewayService();
const security = new SecurityService();
const fraudDetection = new FraudDetectionService();
const ussd = new USSDService();
const monitoring = new MonitoringService();
const analytics = new AnalyticsService();

// Enhanced rate limiting
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per IP
    message: { error: 'Too many payment requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many admin requests.' }
});

// Security middleware
const validateWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!security.validateWebhookSignature(req.body, signature, timestamp)) {
        monitoring.logSecurityEvent('invalid_webhook_signature', req);
        return res.status(401).json({ error: 'Invalid signature' });
    }
    
    next();
};

const csrfProtection = (req, res, next) => {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    if (!security.validateCSRFToken(token)) {
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
};

// Idempotency middleware
const idempotencyMiddleware = async (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key header required' });
    }
    
    const existing = await security.checkIdempotency(idempotencyKey);
    if (existing) {
        return res.json(existing);
    }
    
    req.idempotencyKey = idempotencyKey;
    next();
};

// === UNIFIED PAYMENT ENDPOINT ===
app.post('/api/pay', paymentLimiter, csrfProtection, idempotencyMiddleware, async (req, res) => {
    const { method, workerId, amount, currency = 'KES', customerPhone, customerEmail } = req.body;
    
    try {
        // Validate worker exists
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('worker_id, name, phone')
            .eq('worker_id', workerId)
            .single();
        
        if (workerError || !worker) {
            return res.json({ success: false, error: 'Worker not found' });
        }
        
        // Fraud detection
        const fraudCheck = await fraudDetection.checkTransaction({
            workerId,
            amount,
            customerPhone,
            customerEmail,
            method
        });
        
        if (fraudCheck.flagged) {
            monitoring.logSecurityEvent('fraud_detected', { workerId, amount, reason: fraudCheck.reason });
            return res.json({ success: false, error: 'Transaction flagged for review' });
        }
        
        // Process payment through gateway
        const paymentResult = await paymentGateway.processPayment({
            method,
            amount,
            currency,
            customer: {
                phone: customerPhone,
                email: customerEmail
            },
            metadata: {
                workerId,
                workerName: worker.name
            }
        });
        
        // Store transaction
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                worker_id: workerId,
                customer_number: customerPhone || customerEmail,
                amount: amount,
                currency: currency,
                status: 'PENDING',
                gateway: method,
                payment_reference: paymentResult.reference,
                raw_payload: paymentResult.raw,
                fraud_score: fraudCheck.score
            })
            .select()
            .single();
        
        if (txError) {
            console.error('Transaction record error:', txError);
            return res.json({ success: false, error: 'Failed to record transaction' });
        }
        
        // Store idempotency result
        await security.storeIdempotency(req.idempotencyKey, {
            success: true,
            transactionId: transaction.id,
            paymentReference: paymentResult.reference,
            checkoutUrl: paymentResult.checkoutUrl
        });
        
        // Analytics
        analytics.trackEvent('payment_initiated', {
            workerId,
            amount,
            currency,
            method,
            fraudScore: fraudCheck.score
        });
        
        res.json({
            success: true,
            transactionId: transaction.id,
            paymentReference: paymentResult.reference,
            checkoutUrl: paymentResult.checkoutUrl,
            message: paymentResult.message
        });
        
    } catch (error) {
        console.error('Payment error:', error);
        monitoring.logError('payment_failed', error, { workerId, amount, method });
        res.json({ success: false, error: 'Payment processing failed' });
    }
});

// === USSD QR GENERATION ===
app.post('/generate-ussd-qr', async (req, res) => {
    const { workerId, type = 'standard' } = req.body;
    
    try {
        const qrData = await ussd.generateUSSDQR(workerId, type);
        res.json(qrData);
    } catch (error) {
        console.error('USSD QR generation error:', error);
        res.status(500).json({ error: 'Failed to generate USSD QR code' });
    }
});

// === WEBHOOK HANDLERS ===
app.post('/webhooks/mpesa', validateWebhookSignature, async (req, res) => {
    console.log('=== M-PESA WEBHOOK RECEIVED ===');
    
    try {
        const result = await paymentGateway.handleWebhook('mpesa', req.body);
        
        if (result.success) {
            // Update transaction
            await supabase
                .from('transactions')
                .update({
                    status: result.status,
                    mpesa_tx_id: result.transactionId,
                    raw_payload: { ...result.originalPayload, webhook: req.body },
                    updated_at: new Date().toISOString()
                })
                .eq('payment_reference', result.reference);
            
            // Queue payout if successful
            if (result.status === 'COMPLETED') {
                await paymentGateway.enqueuePayout(result.transactionId, result.workerId, result.amount);
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
        
    } catch (error) {
        console.error('M-Pesa webhook error:', error);
        res.json({ ResultCode: 1, ResultDesc: 'Error processing webhook' });
    }
});

app.post('/webhooks/stripe', validateWebhookSignature, async (req, res) => {
    try {
        const result = await paymentGateway.handleWebhook('stripe', req.body);
        res.json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({ error: 'Webhook processing failed' });
    }
});

app.post('/webhooks/paypal', validateWebhookSignature, async (req, res) => {
    try {
        const result = await paymentGateway.handleWebhook('paypal', req.body);
        res.json({ received: true });
    } catch (error) {
        console.error('PayPal webhook error:', error);
        res.status(400).json({ error: 'Webhook processing failed' });
    }
});

// === USSD RECONCILIATION ===
app.post('/api/ussd-reconcile', async (req, res) => {
    const { mpesaCode, amount, phoneNumber } = req.body;
    
    try {
        const result = await ussd.reconcileUSSDPayment(mpesaCode, amount, phoneNumber);
        res.json(result);
    } catch (error) {
        console.error('USSD reconciliation error:', error);
        res.status(500).json({ error: 'Reconciliation failed' });
    }
});

// === ADMIN ENDPOINTS WITH 2FA ===
app.use('/admin', adminLimiter);

app.post('/admin/login', async (req, res) => {
    const { username, password, totpCode } = req.body;
    
    try {
        const authResult = await security.authenticateAdmin(username, password, totpCode);
        
        if (authResult.success) {
            const token = security.generateAdminToken(authResult.user);
            res.json({ success: true, token, user: authResult.user });
        } else {
            res.status(401).json({ success: false, error: authResult.error });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/admin/transactions', security.requireAdminAuth, async (req, res) => {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                *,
                workers(name, phone),
                payouts(status, daraja_response)
            `)
            .order('created_at', { ascending: false })
            .limit(100);
        
        // Mask PII
        const maskedTransactions = transactions.map(tx => ({
            ...tx,
            customer_number: security.maskPII(tx.customer_number)
        }));
        
        res.json({ transactions: maskedTransactions });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

app.post('/admin/approve-transaction/:txId', security.requireAdminAuth, async (req, res) => {
    const { txId } = req.params;
    
    try {
        // Update transaction status
        await supabase
            .from('transactions')
            .update({ 
                status: 'APPROVED',
                approved_by: req.adminUser.id,
                approved_at: new Date().toISOString()
            })
            .eq('id', txId);
        
        // Queue payout
        const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', txId)
            .single();
        
        if (transaction) {
            await paymentGateway.enqueuePayout(txId, transaction.worker_id, transaction.amount);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Transaction approval error:', error);
        res.status(500).json({ error: 'Approval failed' });
    }
});

// === ANALYTICS ENDPOINTS ===
app.get('/admin/analytics', security.requireAdminAuth, async (req, res) => {
    try {
        const analyticsData = await analytics.getDashboardData();
        res.json(analyticsData);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// === MONITORING ENDPOINTS ===
app.get('/health', (req, res) => {
    const healthStatus = monitoring.getHealthStatus();
    res.json(healthStatus);
});

app.get('/metrics', (req, res) => {
    const metrics = monitoring.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
});

// === ERROR HANDLING ===
app.use((error, req, res, next) => {
    monitoring.logError('unhandled_error', error, { url: req.url, method: req.method });
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 TTip Phase 3 Server running on port ${PORT}`);
    console.log('Features: Multi-Gateway, USSD, Security Hardening, Fraud Detection');
    
    // Initialize monitoring
    monitoring.startHealthChecks();
    analytics.startEventProcessing();
});

export default app;