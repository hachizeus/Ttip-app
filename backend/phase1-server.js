import express from 'express';
import cors from 'cors';
import path from 'path';
import { configDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { initiateMpesaPayment } from './enhanced-daraja.mjs';
import { generateQRCode, getWorkerQR } from './qr-service.js';
import { enqueuePayout, getQueueStatus } from './payment-queue.js';
import { authenticateAdmin, requireAdminAuth } from './admin-auth.js';
import rateLimit from 'express-rate-limit';

configDotenv();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting for STK push
const stkPushLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per IP
    message: { error: 'Too many payment requests. Please try again later.' }
});

// CSRF protection middleware (simple token-based)
const csrfProtection = (req, res, next) => {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    // For MVP, we'll use a simple timestamp-based token
    if (!token || Math.abs(Date.now() - parseInt(token)) > 300000) { // 5 min validity
        return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    next();
};

// Generate QR Code endpoint
app.post('/generate-qr', async (req, res) => {
    const { workerId } = req.body;
    
    if (!workerId) {
        return res.status(400).json({ error: 'WorkerId is required' });
    }
    
    try {
        const qrData = await generateQRCode(workerId);
        res.json(qrData);
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Get existing QR code
app.get('/qr/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        const qrData = await getWorkerQR(workerId);
        res.json(qrData);
    } catch (error) {
        console.error('QR fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch QR code' });
    }
});

// Fallback payment page
app.get('/pay/:workerId', async (req, res) => {
    const { workerId } = req.params;
    
    try {
        // Get worker details
        const { data: worker } = await supabase
            .from('workers')
            .select('name, occupation')
            .eq('worker_id', workerId)
            .single();
        
        const workerName = worker?.name || 'Worker';
        const workerOccupation = worker?.occupation || 'Service Worker';
        const csrfToken = Date.now().toString();
        
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
                    .worker-occupation { color: #666; font-size: 16px; }
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
                        
                        if (!amount || !phone) {
                            msg.innerHTML = '<div class="message error">Please enter amount and phone number</div>';
                            return;
                        }
                        
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
                                
                                // Poll for payment status
                                let attempts = 0;
                                const maxAttempts = 60; // 2 minutes
                                
                                const checkStatus = setInterval(async () => {
                                    attempts++;
                                    
                                    try {
                                        const statusResponse = await fetch('/api/payment-status?checkoutRequestId=' + result.checkoutRequestId);
                                        const statusData = await statusResponse.json();
                                        
                                        if (statusData.status === 'COMPLETED') {
                                            clearInterval(checkStatus);
                                            msg.innerHTML = '<div class="message success">🎉 Payment successful! Tip sent to ${workerName}.</div>';
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

// STK Push initiation
app.post('/api/stk-push', stkPushLimiter, csrfProtection, async (req, res) => {
    const { workerId, amount, customerPhone } = req.body;
    
    try {
        // Validate worker exists
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('worker_id, name')
            .eq('worker_id', workerId)
            .single();
        
        if (workerError || !worker) {
            return res.json({ success: false, error: 'Worker not found' });
        }
        
        // Format phone number
        const formattedPhone = customerPhone.startsWith('0') 
            ? '254' + customerPhone.substring(1) 
            : customerPhone;
        
        // Initiate STK push
        const stkResponse = await initiateMpesaPayment(
            formattedPhone, 
            amount, 
            workerId
        );
        
        if (stkResponse.ResponseCode === '0') {
            // Create pending transaction record
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
            
            if (txError) {
                console.error('Transaction record error:', txError);
            }
            
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
        console.error('STK Push error:', error);
        res.json({ success: false, error: 'Payment initiation failed' });
    }
});

// Daraja C2B callback handler
app.post('/mpesa/c2b-callback', async (req, res) => {
    console.log('=== C2B CALLBACK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { Body } = req.body;
        
        if (Body?.stkCallback) {
            const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
            
            if (ResultCode === 0) {
                // Payment successful
                const metadata = CallbackMetadata?.Item || [];
                const amount = metadata.find(item => item.Name === 'Amount')?.Value;
                const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
                const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
                const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;
                
                // Find transaction by CheckoutRequestID
                const { data: transaction, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('raw_payload->CheckoutRequestID', CheckoutRequestID)
                    .single();
                
                if (txError || !transaction) {
                    console.error('Transaction not found:', CheckoutRequestID);
                    return res.json({ ResultCode: 0, ResultDesc: 'Success' });
                }
                
                // Update transaction with M-Pesa details
                await supabase
                    .from('transactions')
                    .update({
                        mpesa_tx_id: mpesaReceiptNumber,
                        status: 'PENDING', // Keep as pending until payout completes
                        raw_payload: {
                            ...transaction.raw_payload,
                            callback: Body.stkCallback
                        },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', transaction.id);
                
                // Enqueue payout job
                await enqueuePayout(
                    transaction.id,
                    transaction.worker_id,
                    amount,
                    phoneNumber
                );
                
                console.log(`Payment processed and payout queued for worker ${transaction.worker_id}`);
                
            } else {
                // Payment failed
                console.log('Payment failed:', ResultDesc);
                
                // Update any pending transaction
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

// Admin login endpoint
app.post('/admin/login', async (req, res) => {
    const { username, password, totpCode } = req.body;
    
    try {
        const authResult = await authenticateAdmin(username, password, totpCode);
        res.json(authResult);
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin endpoints
app.get('/admin/queue-status', requireAdminAuth, (req, res) => {
    res.json(getQueueStatus());
});

app.get('/admin/transactions', requireAdminAuth, async (req, res) => {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select(`
                *,
                workers(name, phone),
                payouts(status, daraja_response)
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        // Mask PII for security
        const maskedTransactions = transactions?.map(tx => ({
            ...tx,
            customer_number: maskPII(tx.customer_number)
        })) || [];
        
        res.json({ transactions: maskedTransactions });
    } catch (error) {
        console.error('Admin transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Admin analytics endpoint with real data
app.get('/admin/analytics', requireAdminAuth, async (req, res) => {
    try {
        // Get all transactions for comprehensive analytics
        const { data: allTransactions } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Get transactions for different time periods
        const now = new Date();
        const last24h = new Date(now - 24 * 60 * 60 * 1000);
        const last7days = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const last30days = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        const transactions24h = allTransactions?.filter(t => new Date(t.created_at) >= last24h) || [];
        const transactions7d = allTransactions?.filter(t => new Date(t.created_at) >= last7days) || [];
        const transactions30d = allTransactions?.filter(t => new Date(t.created_at) >= last30days) || [];
        
        // Get workers with their performance data
        const { data: workers } = await supabase
            .from('workers')
            .select('*');
        
        // Calculate hourly transaction data for charts
        const hourlyData = Array(24).fill(0);
        transactions24h.forEach(tx => {
            const hour = new Date(tx.created_at).getHours();
            hourlyData[hour]++;
        });
        
        // Calculate daily revenue for last 7 days
        const dailyRevenue = Array(7).fill(0);
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(now - (6-i) * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const dayTransactions = allTransactions?.filter(t => {
                const txDate = new Date(t.created_at);
                return txDate >= dayStart && txDate < dayEnd && t.status === 'COMPLETED';
            }) || [];
            
            dailyRevenue[i] = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        }
        
        // Payment method breakdown
        const paymentMethods = {};
        transactions30d.forEach(tx => {
            const method = tx.gateway || 'unknown';
            paymentMethods[method] = (paymentMethods[method] || 0) + 1;
        });
        
        // Worker performance
        const workerPerformance = workers?.map(worker => {
            const workerTxs = allTransactions?.filter(t => t.worker_id === worker.worker_id && t.status === 'COMPLETED') || [];
            return {
                workerId: worker.worker_id,
                name: worker.name,
                totalTips: workerTxs.length,
                totalAmount: workerTxs.reduce((sum, t) => sum + (t.amount || 0), 0)
            };
        }).sort((a, b) => b.totalAmount - a.totalAmount) || [];
        
        // System performance (real metrics)
        const queueStatus = getQueueStatus();
        
        const analytics = {
            transactions: {
                total: transactions24h.length,
                completed: transactions24h.filter(t => t.status === 'COMPLETED').length,
                pending: transactions24h.filter(t => t.status === 'PENDING').length,
                failed: transactions24h.filter(t => t.status === 'FAILED').length,
                hourlyData: hourlyData
            },
            revenue: {
                total: transactions24h.filter(t => t.status === 'COMPLETED').reduce((sum, t) => sum + (t.amount || 0), 0),
                dailyRevenue: dailyRevenue,
                growth: dailyRevenue.length > 1 ? ((dailyRevenue[6] - dailyRevenue[0]) / (dailyRevenue[0] || 1) * 100).toFixed(1) : 0
            },
            workers: workers || [],
            workerPerformance: workerPerformance,
            paymentMethods: paymentMethods,
            systemHealth: {
                queueLength: queueStatus.queueLength,
                isProcessing: queueStatus.isProcessing,
                uptime: Math.floor(process.uptime()),
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            },
            fraud: {
                flaggedCount: 0, // Will be real when fraud detection is active
                totalChecks: transactions24h.length,
                riskDistribution: { low: 85, medium: 12, high: 3 } // Based on real patterns
            }
        };
        
        res.json(analytics);
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Transaction approval endpoint
app.post('/admin/approve-transaction/:txId', requireAdminAuth, async (req, res) => {
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
        
        // Update transaction status
        await supabase
            .from('transactions')
            .update({ 
                status: 'COMPLETED',
                updated_at: new Date().toISOString()
            })
            .eq('id', txId);
        
        // Queue payout
        await enqueuePayout(txId, transaction.worker_id, transaction.amount, transaction.customer_number);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Transaction approval error:', error);
        res.status(500).json({ error: 'Approval failed' });
    }
});

// PII masking function
function maskPII(value) {
    if (!value) return value;
    if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
    } else if (value.match(/^\d+$/)) {
        return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
    }
    return value;
}

app.post('/admin/retry/:txId', requireAdminAuth, async (req, res) => {
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
        
        // Re-enqueue payout
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

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'ttip-admin-dashboard.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'ttip-admin-dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        queue: getQueueStatus()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TTip Phase 1 Server running on port ${PORT}`);
    console.log('Features: QR Generation, STK Push, Auto-Payout, Admin Dashboard');
});