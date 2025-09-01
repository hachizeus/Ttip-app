import express, { json } from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { initiateMpesaPayment, initiateB2CPayment } from './enhanced-daraja.mjs';
import { sendTipNotification, sendOTPSMS } from './sms.mjs';

configDotenv({ path: './.env' });

const app = express();
app.use(json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ttip-frontend.onrender.com',
  credentials: true
}));

// Security middleware
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const otpStore = new Map();
const rateLimitStore = new Map();

// Simple API key middleware for sensitive endpoints
const requireApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// STK Push endpoint
app.post('/api/pay', async (req, res) => {
    const { phone, amount, accountReference } = req.body;
    
    try {
        const response = await initiateMpesaPayment(phone, amount, accountReference);
        res.json(response);
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// STK Push callback
app.post('/api/callback', async (req, res) => {
    console.log('=== M-PESA CALLBACK RECEIVED ===');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('================================');
    
    const { Body } = req.body;
    if (Body?.stkCallback) {
        const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;
        
        if (ResultCode === 0) {
            const metadata = CallbackMetadata?.Item || [];
            const amount = metadata.find(item => item.Name === 'Amount')?.Value;
            const receipt = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
            
            // Check if this is a subscription payment
            const { data: subscriptionPayment } = await supabase
                .from('subscription_payments')
                .select('*')
                .eq('transaction_id', Body.stkCallback.CheckoutRequestID)
                .single();
            
            if (subscriptionPayment) {
                // Handle subscription payment
                console.log('Processing subscription payment:', subscriptionPayment);
                
                // Update subscription payment status
                await supabase
                    .from('subscription_payments')
                    .update({ 
                        status: 'completed',
                        mpesa_receipt: receipt,
                        updated_at: new Date().toISOString()
                    })
                    .eq('transaction_id', Body.stkCallback.CheckoutRequestID);
                
                // Update worker subscription
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month subscription
                
                // Map plan names to match database constraints
                const planMapping = {
                    'lite_plan': 'lite',
                    'pro_plan': 'pro'
                };
                const dbPlan = planMapping[subscriptionPayment.plan] || subscriptionPayment.plan;
                
                const { error: updateError } = await supabase
                    .from('workers')
                    .update({
                        subscription_plan: dbPlan,
                        subscription_expiry: expiryDate.toISOString()
                    })
                    .eq('phone', subscriptionPayment.phone);
                
                if (updateError) {
                    console.error('Error updating worker subscription:', updateError);
                } else {
                    console.log(`Worker subscription updated: ${subscriptionPayment.plan} for ${subscriptionPayment.phone}`);
                }
                
                console.log(`Subscription activated: ${subscriptionPayment.plan} for ${subscriptionPayment.phone}`);
                res.json({ ResultCode: 0, ResultDesc: 'Success' });
                return;
            }
            
            // Try to update tip status, but check if record exists first
            const { data: existingTip } = await supabase
                .from('tips')
                .select('id')
                .eq('transaction_id', Body.stkCallback.CheckoutRequestID)
                .single();
            
            if (existingTip) {
                // Update existing record
                const { error } = await supabase
                    .from('tips')
                    .update({ 
                        status: 'completed',
                        mpesa_receipt: receipt,
                        updated_at: new Date().toISOString()
                    })
                    .eq('transaction_id', Body.stkCallback.CheckoutRequestID);
                
                console.log('Tip status updated to completed:', Body.stkCallback.CheckoutRequestID);
                console.log('Update error:', error);
            } else {
                // Skip creating new record without proper worker_id - this should come from the original tip request
                console.log('Tip record not found, cannot create without proper worker_id from original request');
            }
            
            // Get worker details for payout
            const { data: tip, error: tipError } = await supabase
                .from('tips')
                .select('worker_id, amount')
                .eq('transaction_id', Body.stkCallback.CheckoutRequestID)
                .single();
            
            console.log('Tip lookup result:', { tip, tipError, transactionId: Body.stkCallback.CheckoutRequestID });
            
            if (tip) {
                // Update worker statistics
                const { error: updateError } = await supabase
                    .rpc('increment_worker_tips', {
                        worker_id_param: tip.worker_id,
                        tip_amount: tip.amount
                    });
                
                if (updateError) {
                    console.error('Error updating worker stats:', updateError);
                    // Fallback: manual update
                    await supabase
                        .from('workers')
                        .update({
                            total_tips: supabase.raw('total_tips + ?', [tip.amount]),
                            tip_count: supabase.raw('tip_count + 1')
                        })
                        .eq('worker_id', tip.worker_id);
                }
                
                const { data: worker } = await supabase
                    .from('workers')
                    .select('phone, name')
                    .eq('worker_id', tip.worker_id)
                    .single();
                
                if (worker) {
                    // Initiate B2C payout to worker
                    try {
                        console.log(`Attempting B2C payout: ${tip.amount} KSh to ${worker.phone}`);
                        const b2cResponse = await initiateB2CPayment(
                            worker.phone, 
                            tip.amount, 
                            `Tip payout for ${worker.name}`
                        );
                        console.log(`B2C payout response:`, b2cResponse);
                    } catch (b2cError) {
                        console.error('B2C payout failed:', {
                            message: b2cError.message,
                            response: b2cError.response?.data,
                            stack: b2cError.stack
                        });
                    }
                    
                    // Send SMS notification
                    await sendTipNotification(worker.phone, tip.amount);
                    console.log(`Tip completed: ${tip.amount} KSh for worker ${tip.worker_id}`);
                }
            }
        } else {
            // Payment failed
            await supabase
                .from('tips')
                .update({ 
                    status: 'failed',
                    updated_at: new Date().toISOString()
                })
                .eq('transaction_id', Body.stkCallback.CheckoutRequestID);
        }
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// B2C callback
app.post('/api/b2c-callback', (req, res) => {
    console.log('B2C Callback:', JSON.stringify(req.body, null, 2));
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;
    
    console.log('OTP Request - Phone received:', encodeURIComponent(phone || 'undefined'));
    
    // Rate limiting: max 3 requests per hour per number
    const now = Date.now();
    const rateLimit = rateLimitStore.get(phone) || { count: 0, resetTime: now + 3600000 };
    
    if (now > rateLimit.resetTime) {
        rateLimit.count = 0;
        rateLimit.resetTime = now + 3600000;
    }
    
    if (rateLimit.count >= 3) {
        return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    
    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit
    console.log('Generated OTP:', otp, 'for phone:', encodeURIComponent(phone || 'undefined'));
    
    try {
        await sendOTPSMS(phone, otp);
        otpStore.set(phone, { otp, expires: now + 300000 }); // 5 min
        rateLimit.count++;
        rateLimitStore.set(phone, rateLimit);
        console.log('OTP sent successfully to:', phone);
        res.json({ success: true });
    } catch (error) {
        console.error('OTP send error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    
    // Development bypass - accept 1234 for any phone (remove this in production)
    if (otp === '1234') {
        return res.json({ success: true });
    }
    
    const stored = otpStore.get(phone);
    
    if (!stored || stored.expires < Date.now()) {
        return res.json({ success: false, error: 'OTP expired' });
    }
    
    if (stored.otp === otp) {
        otpStore.delete(phone);
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Invalid OTP' });
    }
});

// Web tip page
app.get('/tip/:workerID', async (req, res) => {
    const { workerID } = req.params;
    
    // Get worker details for display
    const { data: worker } = await supabase
        .from('workers')
        .select('name, occupation')
        .eq('worker_id', workerID)
        .single();
    
    const workerName = worker?.name || 'Worker';
    const workerOccupation = worker?.occupation || 'Service Worker';
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>TTip - Quick Payment</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; }
                h1 { text-align: center; color: #007AFF; }
                input { width: 100%; padding: 15px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
                button { width: 100%; padding: 18px; background: #00C851; color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; }
                button:disabled { opacity: 0.6; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚡ Quick Tip</h1>
                <p>Tip for: ${workerOccupation}</p>
                <input type="number" id="amount" placeholder="Enter tip amount (KSh)" />
                <input type="tel" id="phone" placeholder="Your phone number (0712345678)" />
                <button onclick="sendSTK()" id="payBtn">Send Tip</button>
                <div id="message"></div>
                <div id="loading" style="display:none; text-align:center; margin-top:20px;">
                    <p>⏳ Processing payment...</p>
                    <p>Please complete the payment on your phone</p>
                    <p id="countdown" style="color:#666; font-size:14px;">Checking status...</p>
                </div>
            </div>
            <script>
                async function sendSTK() {
                    const amount = document.getElementById('amount').value;
                    const phone = document.getElementById('phone').value;
                    const btn = document.getElementById('payBtn');
                    const msg = document.getElementById('message');
                    
                    if (!amount || !phone) {
                        msg.innerHTML = '<p style="color:red">Please enter amount and phone number</p>';
                        return;
                    }
                    
                    btn.disabled = true;
                    btn.textContent = 'Sending...';
                    
                    try {
                        const response = await fetch('/api/web-tip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ workerID: '${workerID}', amount: amount, phone: phone })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            msg.innerHTML = '<p style="color:green">STK Push sent! Check your phone to complete payment.</p>';
                            document.getElementById('loading').style.display = 'block';
                            
                            let checkCount = 0;
                            const maxChecks = 90; // 180 seconds / 2 seconds
                            
                            // Check payment status every 2 seconds for real-time updates
                            const checkInterval = setInterval(async () => {
                                checkCount++;
                                const remainingTime = Math.max(0, maxChecks - checkCount) * 2;
                                document.getElementById('countdown').textContent = 'Checking... (' + remainingTime + 's remaining)';
                                
                                try {
                                    const statusResponse = await fetch('/api/payment-status/' + result.checkoutRequestID);
                                    const statusData = await statusResponse.json();
                                    
                                    if (statusData.status === 'completed') {
                                        clearInterval(checkInterval);
                                        document.getElementById('loading').style.display = 'none';
                                        msg.innerHTML = '<p style="color:green">✅ Payment successful! Tip sent to worker.</p>';
                                        btn.textContent = 'Payment Complete ✅';
                                        btn.style.backgroundColor = '#28a745';
                                    } else if (statusData.status === 'failed') {
                                        clearInterval(checkInterval);
                                        document.getElementById('loading').style.display = 'none';
                                        msg.innerHTML = '<p style="color:red">❌ Payment failed. Please try again.</p>';
                                        btn.disabled = false;
                                        btn.textContent = 'Send Tip';
                                    }
                                } catch (error) {
                                    console.log('Status check error:', error);
                                }
                            }, 2000);
                            
                            // Stop checking after 3 minutes
                            setTimeout(() => {
                                clearInterval(checkInterval);
                                document.getElementById('loading').style.display = 'none';
                                if (msg.innerHTML.indexOf('successful') === -1 && msg.innerHTML.indexOf('failed') === -1) {
                                    msg.innerHTML = '<p style="color:orange">⏱️ Payment processing taking longer than expected. Please wait or contact support if money was deducted.</p>';
                                    btn.disabled = false;
                                    btn.textContent = 'Send Tip';
                                }
                            }, 180000);
                        } else {
                            msg.innerHTML = '<p style="color:red">' + (result.error || 'Payment failed') + '</p>';
                        }
                    } catch (error) {
                        msg.innerHTML = '<p style="color:red">Network error. Please try again.</p>';
                    } finally {
                        btn.disabled = false;
                        btn.textContent = 'Send Tip';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Web tip API
app.post('/api/web-tip', async (req, res) => {
    const { workerID, amount, phone } = req.body;
    
    console.log('Web tip request:', { workerID, amount, phone });
    
    try {
        // Format phone for API
        const apiPhone = phone.startsWith('0') ? '254' + phone.substring(1) : phone;
        console.log('Formatted phone:', apiPhone);
        
        // Check worker subscription and limits
        const { data: worker, error: workerError } = await supabase
            .from('workers')
            .select('subscription_plan, subscription_expiry, created_at, phone')
            .eq('worker_id', workerID)
            .single();
        
        if (workerError || !worker) {
            return res.json({ success: false, error: 'Worker not found' });
        }
        
        // Check subscription status
        const now = new Date();
        const createdAt = new Date(worker.created_at);
        const trialEndDate = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const subscriptionExpiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null;
        
        const isTrialActive = now <= trialEndDate;
        const hasActiveSubscription = subscriptionExpiry && now < subscriptionExpiry;
        
        // Check if worker can receive tips
        if (!isTrialActive && !hasActiveSubscription) {
            return res.json({ 
                success: false, 
                error: 'Worker subscription expired. Tips are disabled in limited mode.' 
            });
        }
        
        // Check tip amount limits
        const tipAmount = parseFloat(amount);
        if (worker.subscription_plan === 'lite' && hasActiveSubscription && tipAmount > 500) {
            return res.json({ 
                success: false, 
                error: 'Tip amount exceeds Lite plan limit of 500 KSh. Worker needs Pro plan for higher amounts.' 
            });
        }
        
        // Initiate M-Pesa payment
        const paymentResponse = await initiateMpesaPayment(apiPhone, parseFloat(amount), workerID);
        console.log('Payment response:', paymentResponse);
        
        // Save tip record to database with pending status
        const tipData = {
            worker_id: workerID,
            amount: parseFloat(amount),
            customer_phone: apiPhone,
            transaction_id: paymentResponse.CheckoutRequestID,
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        console.log('Attempting to save tip:', tipData);
        
        const { error, data } = await supabase
            .from('tips')
            .insert(tipData)
            .select();
        
        if (error) {
            console.error('Database error:', error);
        } else {
            console.log('Tip saved successfully:', data);
        }
        
        res.json({ 
            success: true, 
            message: 'STK Push sent successfully',
            checkoutRequestID: paymentResponse.CheckoutRequestID
        });
    } catch (error) {
        console.error('Web tip error details:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        res.json({ success: false, error: error.message || 'Failed to send STK Push' });
    }
});

// Payment status check
app.get('/api/payment-status/:checkoutRequestID', async (req, res) => {
    const { checkoutRequestID } = req.params;
    
    try {
        const { data: tip } = await supabase
            .from('tips')
            .select('status, amount, worker_id')
            .eq('transaction_id', checkoutRequestID)
            .single();
        
        console.log('Payment status check:', { checkoutRequestID, tip });
        res.json({ status: tip?.status || 'pending', tip });
    } catch (error) {
        console.log('Payment status error:', error);
        res.json({ status: 'pending' });
    }
});

// Subscription payment endpoint
app.post('/api/subscription-payment', async (req, res) => {
    const { phone, amount, plan } = req.body;
    
    console.log('Subscription payment request:', { phone, amount, plan });
    
    try {
        // Check current subscription status
        const { data: worker } = await supabase
            .from('workers')
            .select('subscription_plan, subscription_expiry')
            .eq('phone', phone)
            .single();
        
        if (worker) {
            const now = new Date();
            const expiry = worker.subscription_expiry ? new Date(worker.subscription_expiry) : null;
            const hasActiveSubscription = expiry && now < expiry;
            
            // Prevent duplicate subscription to same plan
            if (hasActiveSubscription && worker.subscription_plan === plan.replace('_plan', '')) {
                return res.json({ 
                    success: false, 
                    error: `You already have an active ${plan.replace('_', ' ')}. It expires on ${expiry.toLocaleDateString()}.` 
                });
            }
            
            // Allow upgrades from lite to pro
            if (hasActiveSubscription && worker.subscription_plan === 'lite' && plan === 'pro_plan') {
                console.log('Allowing upgrade from Lite to Pro plan');
            }
            
            // Prevent downgrades from pro to lite
            if (hasActiveSubscription && worker.subscription_plan === 'pro' && plan === 'lite_plan') {
                return res.json({ 
                    success: false, 
                    error: 'Cannot downgrade from Pro to Lite plan. Please wait for your current subscription to expire.' 
                });
            }
        }
        
        // Initiate M-Pesa payment
        const paymentResponse = await initiateMpesaPayment(phone, parseFloat(amount), `subscription_${plan}`);
        console.log('Subscription payment response:', paymentResponse);
        
        // Store subscription payment record
        const { error } = await supabase
            .from('subscription_payments')
            .insert({
                phone: phone,
                amount: parseFloat(amount),
                plan: plan,
                transaction_id: paymentResponse.CheckoutRequestID,
                status: 'pending',
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Subscription payment record error:', error);
        }
        
        res.json({ 
            success: true, 
            message: 'Subscription payment initiated',
            checkoutRequestID: paymentResponse.CheckoutRequestID
        });
    } catch (error) {
        console.error('Subscription payment error:', error);
        res.json({ success: false, error: error.message || 'Failed to initiate payment' });
    }
});

// Subscription payment status
app.get('/api/subscription-status/:checkoutRequestID', async (req, res) => {
    const { checkoutRequestID } = req.params;
    
    try {
        const { data: payment } = await supabase
            .from('subscription_payments')
            .select('status, plan, phone')
            .eq('transaction_id', checkoutRequestID)
            .single();
        
        console.log('Subscription status check:', { checkoutRequestID, payment });
        res.json({ status: payment?.status || 'pending', payment });
    } catch (error) {
        console.log('Subscription status error:', error);
        res.json({ status: 'pending' });
    }
});

// Manual subscription update for completed payments
app.post('/api/fix-subscription/:phone', async (req, res) => {
    const { phone } = req.params;
    
    try {
        // Check if there's a completed subscription payment for this phone
        const { data: payment } = await supabase
            .from('subscription_payments')
            .select('*')
            .eq('phone', phone)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (!payment) {
            return res.json({ success: false, error: 'No completed subscription payment found' });
        }
        
        // Update worker subscription
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        
        const { error: updateError } = await supabase
            .from('workers')
            .update({
                subscription_plan: payment.plan,
                subscription_expiry: expiryDate.toISOString()
            })
            .eq('phone', phone);
        
        if (updateError) {
            return res.json({ success: false, error: updateError.message });
        }
        
        res.json({ 
            success: true, 
            message: `Subscription updated to ${payment.plan} for ${phone}`,
            plan: payment.plan,
            expiry: expiryDate.toISOString()
        });
    } catch (error) {
        console.error('Manual subscription fix error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Manual payment completion (for testing)
app.post('/api/complete-payment/:checkoutRequestID', async (req, res) => {
    const { checkoutRequestID } = req.params;
    
    try {
        // Update tip status
        const { error } = await supabase
            .from('tips')
            .update({ 
                status: 'completed',
                mpesa_receipt: 'MANUAL_TEST_' + Date.now(),
                updated_at: new Date().toISOString()
            })
            .eq('transaction_id', checkoutRequestID);
        
        if (!error) {
            // Get tip details
            const { data: tip } = await supabase
                .from('tips')
                .select('worker_id, amount')
                .eq('transaction_id', checkoutRequestID)
                .single();
            
            if (tip) {
                // Update worker stats
                await supabase
                    .from('workers')
                    .update({
                        total_tips: supabase.raw('total_tips + ?', [tip.amount]),
                        tip_count: supabase.raw('tip_count + 1')
                    })
                    .eq('worker_id', tip.worker_id);
                
                console.log(`Manual completion: ${tip.amount} KSh for worker ${tip.worker_id}`);
            }
        }
        
        res.json({ success: true, message: 'Payment marked as completed' });
    } catch (error) {
        console.error('Manual completion error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Environment check
app.get('/env-check', requireApiKey, (req, res) => {
    res.json({
        hasConsumerKey: !!process.env.CONSUMER_KEY,
        hasConsumerSecret: !!process.env.CONSUMER_SECRET,
        hasShortCode: !!process.env.SHORT_CODE,
        hasPasskey: !!process.env.PASSKEY,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
        baseUrl: process.env.BASE_URL || 'not set',
        consumerKeyPreview: process.env.CONSUMER_KEY ? process.env.CONSUMER_KEY.substring(0, 10) + '...' : 'not set',
        consumerSecretPreview: process.env.CONSUMER_SECRET ? process.env.CONSUMER_SECRET.substring(0, 10) + '...' : 'not set'
    });
});

// Test M-Pesa credentials
app.get('/test-mpesa', requireApiKey, async (req, res) => {
    try {
        console.log('Testing M-Pesa credentials...');
        
        // Test getting access token only
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        const data = await response.json();
        console.log('M-Pesa auth response:', data);
        
        if (data.access_token) {
            res.json({ success: true, message: 'M-Pesa credentials are valid!', tokenPreview: data.access_token.substring(0, 20) + '...' });
        } else {
            res.json({ success: false, error: 'Invalid credentials', response: data });
        }
    } catch (error) {
        console.error('M-Pesa test error:', error);
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TTip Production Server running on port ${PORT}`);
});