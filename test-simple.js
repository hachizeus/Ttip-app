const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '254759001048';

const testAPIs = async () => {
  console.log('🧪 Testing TTip APIs\n');
  
  // Test Health
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);
  } catch (error) {
    console.log('❌ Health failed:', error.message);
    return;
  }
  
  // Test M-Pesa Payment (skip OTP for now)
  console.log('\n🧪 Testing M-Pesa Payment...');
  try {
    const payment = await axios.post(`${BASE_URL}/api/pay`, {
      phone: TEST_PHONE,
      amount: 10,
      accountReference: 'TEST123'
    });
    console.log('✅ M-Pesa Response:', payment.data);
  } catch (error) {
    console.log('❌ M-Pesa failed:', error.response?.data || error.message);
  }
  
  console.log('\n✅ Basic tests completed!');
  console.log('📱 Check your phone for M-Pesa STK push');
};

testAPIs();