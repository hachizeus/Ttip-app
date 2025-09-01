import express, { json } from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv'
import { initiateMpesaPayment, queryPaymentStatus } from './daraja.mjs';
import { createClient } from '@supabase/supabase-js';
configDotenv('./.env')

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const app = express();
app.use(json());
app.use(cors());

// In-memory storage for payment requests (use database in production)
const paymentRequests = new Map();

app.post('/api/pay', async (req, res) => {
    const { phone, amount } = req.body;

    try {
        const response = await initiateMpesaPayment(phone, amount);
        
        // Store payment request for status tracking
        if (response.CheckoutRequestID) {
            paymentRequests.set(response.CheckoutRequestID, {
                status: 'PENDING',
                phone,
                amount,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/payment-status', async (req, res) => {
    const { CheckoutRequestID } = req.body;

    try {
        // Check if we have this payment request
        const paymentRequest = paymentRequests.get(CheckoutRequestID);
        if (!paymentRequest) {
            return res.json({ status: 'NOT_FOUND' });
        }

        // Query M-Pesa for current status
        const statusResponse = await queryPaymentStatus(CheckoutRequestID);
        
        // Update stored status
        paymentRequest.status = statusResponse.status;
        paymentRequests.set(CheckoutRequestID, paymentRequest);
        
        res.json({ status: statusResponse.status });
    } catch (error) {
        res.status(500).json({ error: error.message, status: 'ERROR' });
    }
});

// Subscription payment endpoint
app.post('/api/subscription-payment', async (req, res) => {
    const { phone, amount, plan } = req.body;
    
    try {
        const response = await initiateMpesaPayment(phone, amount);
        
        if (response.ResponseCode === '0') {
            paymentRequests.set(response.CheckoutRequestID, {
                status: 'PENDING',
                phone,
                amount,
                plan,
                type: 'subscription',
                timestamp: new Date().toISOString()
            });
            
            res.json({
                success: true,
                checkoutRequestID: response.CheckoutRequestID,
                message: 'Payment initiated successfully'
            });
        } else {
            res.json({
                success: false,
                error: response.ResponseDescription || 'Payment failed'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Subscription status endpoint
app.get('/api/subscription-status/:checkoutID', async (req, res) => {
    try {
        const { checkoutID } = req.params;
        const paymentRequest = paymentRequests.get(checkoutID);
        
        if (!paymentRequest) {
            return res.json({ status: 'not_found' });
        }
        
        res.json({ status: paymentRequest.status.toLowerCase() });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// Tip page endpoint
app.get('/tip/:workerID', async (req, res) => {
    try {
        const { workerID } = req.params;
        
        // Fetch worker from database
        const { data: worker, error } = await supabase
            .from('workers')
            .select('name, occupation, worker_id')
            .eq('worker_id', workerID)
            .single();
        
        if (error || !worker) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <title>Worker Not Found</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                            .container { max-width: 400px; margin: 0 auto; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>Worker Not Found</h1>
                            <p>The worker with ID ${workerID} does not exist.</p>
                        </div>
                    </body>
                </html>
            `);
        }
        
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Tip ${worker.name}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                        .container { max-width: 400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
                        .worker-info { text-align: center; margin-bottom: 20px; }
                        .worker-name { font-size: 24px; font-weight: bold; color: #0052CC; }
                        .worker-occupation { color: #666; margin: 5px 0; }
                        input, button { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
                        button { background: #0052CC; color: white; border: none; cursor: pointer; }
                        button:hover { background: #003d99; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="worker-info">
                            <div class="worker-name">${worker.name}</div>
                            <div class="worker-occupation">${worker.occupation}</div>
                        </div>
                        <input type="number" id="amount" placeholder="Enter tip amount (KSh)" min="1">
                        <input type="tel" id="phone" placeholder="Your phone number (254...)">
                        <button onclick="sendTip()">Send Tip</button>
                    </div>
                    <script>
                        async function sendTip() {
                            const amount = document.getElementById('amount').value;
                            const phone = document.getElementById('phone').value;
                            
                            if (!amount || !phone) {
                                alert('Please fill all fields');
                                return;
                            }
                            
                            try {
                                const response = await fetch('/api/pay', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        phone, 
                                        amount: parseInt(amount),
                                        workerID: '${workerID}'
                                    })
                                });
                                
                                const result = await response.json();
                                
                                if (result.ResponseCode === '0') {
                                    alert('Payment request sent! Check your phone.');
                                } else {
                                    alert('Payment failed: ' + result.ResponseDescription);
                                }
                            } catch (error) {
                                alert('Error: ' + error.message);
                            }
                        }
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// Auto-expire pending payments after 2 minutes
setInterval(() => {
    const now = new Date();
    for (const [checkoutID, payment] of paymentRequests.entries()) {
        if (payment.status === 'PENDING') {
            const paymentTime = new Date(payment.timestamp);
            const timeDiff = (now.getTime() - paymentTime.getTime()) / 1000;
            
            // Auto-expire after 2 minutes
            if (timeDiff > 120) {
                payment.status = 'FAILED';
                paymentRequests.set(checkoutID, payment);
            }
        }
    }
}, 30000); // Check every 30 seconds

// Callback endpoint for M-Pesa notifications
app.post('/api/callback', (req, res) => {
    const { CheckoutRequestID, ResultCode } = req.body.Body.stkCallback;
    
    const paymentRequest = paymentRequests.get(CheckoutRequestID);
    if (paymentRequest) {
        if (ResultCode === 0) {
            paymentRequest.status = 'SUCCESS';
        } else {
            paymentRequest.status = 'FAILED';
        }
        paymentRequests.set(CheckoutRequestID, paymentRequest);
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
