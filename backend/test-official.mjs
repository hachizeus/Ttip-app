import { initiateMpesaPayment } from './daraja.mjs';
import { configDotenv } from 'dotenv';

configDotenv();

async function testOfficialNumber() {
    try {
        console.log('🧪 Testing with official Daraja test number...');
        
        // Official Daraja test number
        const phoneNumber = '254708374149';
        const amount = 1;
        
        console.log(`📱 Phone: ${phoneNumber} (Official test number)`);
        console.log(`💰 Amount: KSh ${amount}`);
        
        const response = await initiateMpesaPayment(phoneNumber, amount);
        
        console.log('\n📋 STK Push Response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.ResponseCode === '0') {
            console.log('\n✅ Official test number works!');
            console.log('Now testing your number...\n');
            
            // Test your number
            const yourPhone = '0759001048';
            console.log(`📱 Testing your phone: ${yourPhone}`);
            
            const yourResponse = await initiateMpesaPayment(yourPhone, 1);
            console.log('\n📋 Your Phone Response:');
            console.log(JSON.stringify(yourResponse, null, 2));
            
            if (yourResponse.ResponseCode === '0') {
                console.log('\n✅ Your number also accepted!');
                console.log('💡 Possible reasons you didn\'t get STK push:');
                console.log('1. Phone is not on Safaricom network');
                console.log('2. M-Pesa not activated on your line');
                console.log('3. Phone has poor network coverage');
                console.log('4. M-Pesa app needs to be updated');
                console.log('5. Sandbox environment limitations');
            } else {
                console.log('\n❌ Your number rejected:');
                console.log(`Code: ${yourResponse.ResponseCode}`);
                console.log(`Message: ${yourResponse.ResponseDescription}`);
            }
            
        } else {
            console.log('\n❌ System issue - even test number failed');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testOfficialNumber();