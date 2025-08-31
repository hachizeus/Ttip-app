import express, { json } from 'express';
import { configDotenv } from 'dotenv'
import { initiateMpesaPayment, initiateB2CPayment, getAccessToken } from './enhanced-daraja.mjs';
configDotenv('./.env')

const app = express();
app.use(json());

// STK Push endpoint
app.post('/api/pay', async (req, res) => {
    const { phone, amount, accountReference } = req.body;

    try {
        const response = await initiateMpesaPayment(phone, amount, accountReference);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// STK Push callback
app.post('/api/callback', async (req, res) => {
    console.log('STK Push Callback:', JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    if (Body && Body.stkCallback) {
        const { ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;
        
        if (ResultCode === 0) {
            // Payment successful
            const metadata = CallbackMetadata?.Item || [];
            const amount = metadata.find(item => item.Name === 'Amount')?.Value;
            const transactionId = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phone = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
            
            console.log('Payment successful:', { amount, transactionId, phone });
            
            // Here you would:
            // 1. Update tip status in Supabase
            // 2. Check worker subscription limits
            // 3. Initiate B2C payment to worker
            // 4. Send SMS notification
            
            // For now, just log
            console.log('Processing payout to worker...');
        } else {
            console.log('Payment failed:', ResultDesc);
        }
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

// B2C Payment endpoint
app.post('/api/payout', async (req, res) => {
    const { phone, amount, remarks } = req.body;

    try {
        const response = await initiateB2CPayment(phone, amount, remarks);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// B2C callback
app.post('/api/b2c-callback', (req, res) => {
    console.log('B2C Callback:', JSON.stringify(req.body, null, 2));
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Enhanced TTip server running on port ${PORT}`);
});