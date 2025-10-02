import axios from 'axios';

// Test callback with sample M-Pesa data
const testCallback = async () => {
    const sampleCallback = {
        Body: {
            stkCallback: {
                MerchantRequestID: "1a21-4f53-86f5-c8c984f35d8a16246",
                CheckoutRequestID: "ws_CO_02102025170506392759001048", // Using your latest transaction
                ResultCode: 0,
                ResultDesc: "The service request is processed successfully.",
                CallbackMetadata: {
                    Item: [
                        { Name: "Amount", Value: 1 },
                        { Name: "MpesaReceiptNumber", Value: "TEST123456" },
                        { Name: "TransactionDate", Value: 20251002170506 },
                        { Name: "PhoneNumber", Value: 254708374149 }
                    ]
                }
            }
        }
    };

    try {
        console.log('Sending test callback...');
        const response = await axios.post('http://localhost:3000/mpesa/c2b-callback', sampleCallback, {
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('Callback response:', response.data);
        console.log('Status:', response.status);
    } catch (error) {
        console.error('Callback test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
};

testCallback();