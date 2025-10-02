import axios from 'axios';

// Test callback with a different transaction
const testCallback = async () => {
    const sampleCallback = {
        Body: {
            stkCallback: {
                MerchantRequestID: "1db1-4208-92c7-1269f74679c313193",
                CheckoutRequestID: "ws_CO_02102025170241422759001048", // Using second transaction
                ResultCode: 0,
                ResultDesc: "The service request is processed successfully.",
                CallbackMetadata: {
                    Item: [
                        { Name: "Amount", Value: 1 },
                        { Name: "MpesaReceiptNumber", Value: "FINAL123456" },
                        { Name: "TransactionDate", Value: 20251002170241 },
                        { Name: "PhoneNumber", Value: 254708374149 }
                    ]
                }
            }
        }
    };

    try {
        console.log('Sending final test callback...');
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