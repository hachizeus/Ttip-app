// TTip Worker Signup Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testWorkerSignup() {
    console.log('🧪 Testing Worker Signup Flow...\n');
    
    const testWorker = {
        name: 'Test Worker',
        phone: '254712345678',
        gender: 'Male',
        occupation: 'Electrician',
        bio: 'Professional electrician with 5 years experience'
    };
    
    try {
        // Test 1: Valid signup
        console.log('✅ Test 1: Valid worker signup');
        const response = await axios.post(`${BASE_URL}/api/workers/register`, testWorker);
        console.log('Response:', response.data);
        console.log('Worker ID:', response.data.worker?.worker_id);
        console.log('QR Code:', response.data.worker?.qr_code);
        
        // Test 2: Duplicate phone number
        console.log('\n✅ Test 2: Duplicate phone number');
        try {
            await axios.post(`${BASE_URL}/api/workers/register`, testWorker);
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 3: Invalid phone format
        console.log('\n✅ Test 3: Invalid phone format');
        try {
            await axios.post(`${BASE_URL}/api/workers/register`, {
                ...testWorker,
                phone: '123456'
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 4: Missing required fields
        console.log('\n✅ Test 4: Missing required fields');
        try {
            await axios.post(`${BASE_URL}/api/workers/register`, {
                name: 'Test Worker'
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        console.log('\n🎉 Worker Signup Tests Completed!');
        return response.data.worker;
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testWorkerSignup };

// Run if called directly
if (require.main === module) {
    testWorkerSignup().catch(console.error);
}