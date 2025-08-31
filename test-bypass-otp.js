// Bypass OTP for testing - use a fixed code
const axios = require('axios');

const testBypassOTP = async () => {
  console.log('🧪 Testing OTP Bypass for Development\n');
  
  const phone = '254759001048';
  const testOTP = '1234'; // Fixed test code
  
  try {
    // Manually set OTP in backend
    const verifyResponse = await axios.post('http://192.168.1.3:3000/api/verify-otp', {
      phone: phone,
      otp: testOTP
    });
    
    console.log('OTP Verification:', verifyResponse.data);
    
    if (verifyResponse.data.success) {
      console.log('✅ Use OTP: 1234 to login');
    } else {
      console.log('❌ Try different OTP or check backend');
    }
    
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
};

testBypassOTP();