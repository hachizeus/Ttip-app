import axios from 'axios';

async function simulateCallback() {
    try {
        console.log('🧪 Simulating successful M-Pesa callback...');
        
        const callbackData = {
            Body: {
                stkCallback: {
                    MerchantRequestID: "test-merchant-123",
                    CheckoutRequestID: "ws_CO_test_123456789",
                    ResultCode: 0,
                    ResultDesc: "The service request is processed successfully.",
                    CallbackMetadata: {
                        Item: [
                            { Name: "Amount", Value: 10 },
                            { Name: "MpesaReceiptNumber", Value: "TEST123456" },
                            { Name: "PhoneNumber", Value: 254759001048 }
                        ]
                    }
                }
            }
        };
        
        console.log('📤 Sending callback to production server...');
        
        const response = await axios.post('https://ttip-app.onrender.com/api/callback', callbackData, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Callback sent successfully');
        console.log('Response:', response.status, response.statusText);
        
    } catch (error) {
        console.error('❌ Callback failed:', error.message);
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', error.response.data);
        }
    }
}

simulateCallback();