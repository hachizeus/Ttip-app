import { initiateMpesaPayment } from './daraja.mjs';
import { configDotenv } from 'dotenv';

configDotenv();

async function testSTK() {
    try {
        console.log('🧪 Testing STK Push to 0759001048...');
        
        const phoneNumber = '0759001048';
        const amount = 10;
        
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`💰 Amount: KSh ${amount}`);
        
        const response = await initiateMpesaPayment(phoneNumber, amount);
        
        console.log('\n📋 STK Push Response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.ResponseCode === '0') {
            console.log('\n✅ STK Push sent successfully!');
            console.log(`🔍 CheckoutRequestID: ${response.CheckoutRequestID}`);
            console.log('📱 Check your phone for M-Pesa prompt');
        } else {
            console.log('\n❌ STK Push failed:');
            console.log(`Code: ${response.ResponseCode}`);
            console.log(`Message: ${response.ResponseDescription}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSTK();