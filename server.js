import express, { json } from 'express';
import cors from 'cors';
import { configDotenv } from 'dotenv'
import { initiateMpesaPayment, queryPaymentStatus } from './daraja.mjs';
configDotenv('./.env')

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
        
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Tip Worker</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .container { max-width: 400px; margin: 0 auto; }
                        input, button { width: 100%; padding: 10px; margin: 10px 0; }
                        button { background: #0052CC; color: white; border: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Send a Tip</h1>
                        <p>Worker ID: ${workerID}</p>
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
                                    body: JSON.stringify({ phone, amount: parseInt(amount) })
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
