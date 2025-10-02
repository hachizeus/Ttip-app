// Test server status
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

const testServer = async () => {
    try {
        console.log('🔍 Testing server status...');
        
        // Test health endpoint
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server is running');
        console.log('   Status:', health.data.status);
        console.log('   Phase:', health.data.phase);
        
        // Test analytics endpoint
        try {
            const analytics = await axios.get(`${BASE_URL}/api/analytics/W001TEST`);
            console.log('✅ Analytics endpoint working');
        } catch (error) {
            console.log('❌ Analytics endpoint failed:', error.response?.status || error.message);
        }
        
    } catch (error) {
        console.log('❌ Server not running or not accessible');
        console.log('   Error:', error.message);
        console.log('\n💡 To start server: npm start');
    }
};

testServer();