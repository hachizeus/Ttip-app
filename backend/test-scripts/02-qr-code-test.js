// TTip QR Code Generation & Scanning Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testQRCodeFlow() {
    console.log('🧪 Testing QR Code Generation & Scanning...\n');
    
    const testWorkerId = 'WCMNAYISA'; // Victor's worker ID
    
    try {
        // Test 1: Generate QR Code
        console.log('✅ Test 1: Generate QR Code');
        const qrResponse = await axios.post(`${BASE_URL}/generate-qr`, {
            workerId: testWorkerId
        });
        console.log('QR Generated:', qrResponse.data);
        
        // Test 2: Get existing QR Code
        console.log('\n✅ Test 2: Get existing QR Code');
        const getQrResponse = await axios.get(`${BASE_URL}/qr/${testWorkerId}`);
        console.log('QR Retrieved:', getQrResponse.data);
        
        // Test 3: Access payment page via QR
        console.log('\n✅ Test 3: Access payment page');
        const paymentPageResponse = await axios.get(`${BASE_URL}/pay/${testWorkerId}`);
        console.log('Payment page loaded:', paymentPageResponse.status === 200 ? 'SUCCESS' : 'FAILED');
        console.log('Page contains worker name:', paymentPageResponse.data.includes('Victor') ? 'YES' : 'NO');
        
        // Test 4: Invalid worker ID
        console.log('\n✅ Test 4: Invalid worker ID');
        try {
            await axios.post(`${BASE_URL}/generate-qr`, {
                workerId: 'INVALID123'
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 5: Missing worker ID
        console.log('\n✅ Test 5: Missing worker ID');
        try {
            await axios.post(`${BASE_URL}/generate-qr`, {});
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        console.log('\n🎉 QR Code Tests Completed!');
        return qrResponse.data;
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testQRCodeFlow };

// Run if called directly
if (require.main === module) {
    testQRCodeFlow().catch(console.error);
}