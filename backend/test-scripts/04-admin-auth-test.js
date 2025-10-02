// TTip Admin Authentication & Security Test Script
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAdminAuth() {
    console.log('🧪 Testing Admin Authentication & Security...\n');
    
    const validCredentials = {
        username: 'admin',
        password: 'admin123',
        totpCode: '123456'
    };
    
    try {
        // Test 1: Valid admin login
        console.log('✅ Test 1: Valid admin login');
        const loginResponse = await axios.post(`${BASE_URL}/admin/login`, validCredentials);
        console.log('Login Response:', loginResponse.data);
        const token = loginResponse.data.token;
        
        // Test 2: Access protected endpoint with token
        console.log('\n✅ Test 2: Access protected endpoint with valid token');
        const analyticsResponse = await axios.get(`${BASE_URL}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Analytics access:', analyticsResponse.status === 200 ? 'SUCCESS' : 'FAILED');
        
        // Test 3: Session validation
        console.log('\n✅ Test 3: Session validation');
        const sessionResponse = await axios.get(`${BASE_URL}/admin/validate-session`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Session valid:', sessionResponse.data.valid);
        
        // Test 4: Invalid credentials
        console.log('\n✅ Test 4: Invalid credentials');
        try {
            await axios.post(`${BASE_URL}/admin/login`, {
                username: 'admin',
                password: 'wrongpassword',
                totpCode: '123456'
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 5: Invalid 2FA code
        console.log('\n✅ Test 5: Invalid 2FA code');
        try {
            await axios.post(`${BASE_URL}/admin/login`, {
                username: 'admin',
                password: 'admin123',
                totpCode: '000000'
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 6: Access without token
        console.log('\n✅ Test 6: Access protected endpoint without token');
        try {
            await axios.get(`${BASE_URL}/admin/analytics`);
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 7: Access with invalid token
        console.log('\n✅ Test 7: Access with invalid token');
        try {
            await axios.get(`${BASE_URL}/admin/analytics`, {
                headers: { 'Authorization': 'Bearer invalid_token' }
            });
        } catch (error) {
            console.log('Expected error:', error.response?.data?.error);
        }
        
        // Test 8: Admin logout
        console.log('\n✅ Test 8: Admin logout');
        const logoutResponse = await axios.post(`${BASE_URL}/admin/logout`);
        console.log('Logout success:', logoutResponse.data.success);
        
        console.log('\n🎉 Admin Authentication Tests Completed!');
        return { token, user: loginResponse.data.user };
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { testAdminAuth };

// Run if called directly
if (require.main === module) {
    testAdminAuth().catch(console.error);
}