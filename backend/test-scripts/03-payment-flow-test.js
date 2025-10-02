// TTip Payment Flow Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testPaymentFlow() {
    console.log('🧪 Testing Payment Flow (STK Push)...\n');
    
    const testPayment = {
        workerId: 'WCMNAYISA',
        amount: 50,
        customerPhone: '254708374149'
    };
    
    try {
        // Test 1: Valid STK Push
        console.log('✅ Test 1: Valid STK Push');
        const stkResponse = await axios.post(`${BASE_URL}/api/stk-push`, testPayment, {
            headers: {
                'X-CSRF-Token': Date.now().toString()
            }
        });
        console.log('STK Response:', stkResponse.data);
        console.log('Checkout Request ID:', stkResponse.data.checkoutRequestId);
        
        // Test 2: Check payment status
        console.log('\n✅ Test 2: Check payment status');
        if (stkResponse.data.checkoutRequestId) {
            const statusResponse = await axios.get(`${BASE_URL}/api/payment-status?checkoutRequestId=${stkResponse.data.checkoutRequestId}`);
            console.log('Payment Status:', statusResponse.data);
        }
        
        // Test 3: Invalid worker ID
        console.log('\n✅ Test 3: Invalid worker ID');
        try {
            await axios.post(`${BASE_URL}/api/stk-push`, {
                ...testPayment,
                workerId: 'INVALID123'
            }, {
                headers: { 'X-CSRF-Token': Date.now().toString() }
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 4: Invalid amount
        console.log('\n✅ Test 4: Invalid amount (too low)');
        try {
            await axios.post(`${BASE_URL}/api/stk-push`, {
                ...testPayment,
                amount: 0
            }, {
                headers: { 'X-CSRF-Token': Date.now().toString() }
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 5: Invalid phone number
        console.log('\n✅ Test 5: Invalid phone number');
        try {
            await axios.post(`${BASE_URL}/api/stk-push`, {
                ...testPayment,
                customerPhone: '123456'
            }, {
                headers: { 'X-CSRF-Token': Date.now().toString() }
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 6: Missing CSRF token
        console.log('\n✅ Test 6: Missing CSRF token');
        try {
            await axios.post(`${BASE_URL}/api/stk-push`, testPayment);
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 7: Rate limiting (multiple requests)
        console.log('\n✅ Test 7: Rate limiting');
        for (let i = 0; i < 6; i++) {
            try {
                await axios.post(`${BASE_URL}/api/stk-push`, testPayment, {
                    headers: { 'X-CSRF-Token': Date.now().toString() }
                });
                console.log(`Request ${i + 1}: SUCCESS`);
            } catch (error) {
                console.log(`Request ${i + 1}: ${error.response?.data?.error || 'FAILED'}`);
            }
        }
        
        console.log('\n🎉 Payment Flow Tests Completed!');
        return stkResponse.data;
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testPaymentFlow };

// Run if called directly
if (require.main === module) {
    testPaymentFlow().catch(console.error);
}