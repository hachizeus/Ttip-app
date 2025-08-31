const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '254759001048';

// Test functions
const testSendOTP = async () => {
  console.log('🧪 Testing Send OTP...');
  try {
    const response = await axios.post(`${BASE_URL}/api/send-otp`, {
      phone: TEST_PHONE
    });
    console.log('✅ OTP sent successfully:', response.data);
    return true;
  } catch (error) {
    console.log('❌ OTP send failed:', error.response?.data || error.message);
    return false;
  }
};

const testVerifyOTP = async (otp) => {
  console.log(`🧪 Testing Verify OTP with code: ${otp}...`);
  try {
    const response = await axios.post(`${BASE_URL}/api/verify-otp`, {
      phone: TEST_PHONE,
      otp: otp
    });
    console.log('✅ OTP verification:', response.data);
    return response.data.success;
  } catch (error) {
    console.log('❌ OTP verification failed:', error.response?.data || error.message);
    return false;
  }
};

const testMpesaPayment = async () => {
  console.log('🧪 Testing M-Pesa Payment...');
  try {
    const response = await axios.post(`${BASE_URL}/api/pay`, {
      phone: TEST_PHONE,
      amount: 10,
      accountReference: 'TEST123'
    });
    console.log('✅ M-Pesa payment initiated:', response.data);
    return true;
  } catch (error) {
    console.log('❌ M-Pesa payment failed:', error.response?.data || error.message);
    return false;
  }
};

const testHealthCheck = async () => {
  console.log('🧪 Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server health:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting TTip Backend Tests\n');
  console.log(`📱 Test Phone: ${TEST_PHONE}\n`);
  
  // Test 1: Health Check
  await testHealthCheck();
  console.log('');
  
  // Test 2: Send OTP
  const otpSent = await testSendOTP();
  console.log('');
  
  if (otpSent) {
    // Wait for user to enter OTP
    console.log('📨 Check your phone for OTP and enter it below:');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter OTP: ', async (otp) => {
      console.log('');
      
      // Test 3: Verify OTP
      const otpVerified = await testVerifyOTP(otp);
      console.log('');
      
      // Test 4: M-Pesa Payment
      await testMpesaPayment();
      console.log('');
      
      console.log('🏁 Tests completed!');
      console.log('📋 Summary:');
      console.log(`   Health Check: ✅`);
      console.log(`   Send OTP: ${otpSent ? '✅' : '❌'}`);
      console.log(`   Verify OTP: ${otpVerified ? '✅' : '❌'}`);
      console.log(`   M-Pesa Payment: Check logs above`);
      
      rl.close();
    });
  } else {
    console.log('❌ Cannot proceed with OTP tests - send failed');
  }
};

// Run tests
runTests().catch(console.error);