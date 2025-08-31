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
