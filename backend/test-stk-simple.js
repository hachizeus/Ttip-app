import { initiateMpesaPayment } from './enhanced-daraja.mjs';

async function testSTK() {
    console.log('Testing STK Push...');
    
    try {
        // Use the test number from Daraja documentation
        const response = await initiateMpesaPayment('254708374149', 1, 'TEST123');
        
        console.log('STK Response:', JSON.stringify(response, null, 2));
        
        if (response.ResponseCode === '0') {
            console.log('✅ STK Push sent successfully!');
            console.log('CheckoutRequestID:', response.CheckoutRequestID);
            console.log('Check your phone for M-Pesa prompt');
        } else {
            console.log('❌ STK Push failed:', response.ResponseDescription);
        }
        
    } catch (error) {
        console.error('❌ STK Push error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testSTK();