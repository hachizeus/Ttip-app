import axios from 'axios';

async function testPaymentStatus() {
    const checkoutRequestId = "ws_CO_02102025170506392759001048"; // Transaction with M-Pesa TX ID
    
    try {
        console.log('Checking payment status...');
        const response = await axios.get(`http://localhost:3000/api/payment-status?checkoutRequestId=${checkoutRequestId}`);
        
        console.log('Payment status response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.status === 'COMPLETED') {
            console.log('✅ Transaction shows as COMPLETED!');
        } else {
            console.log('❌ Transaction still shows as:', response.data.status);
        }
        
    } catch (error) {
        console.error('Status check failed:', error.message);
    }
}

testPaymentStatus();