const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

const testMobileOTP = async () => {
  console.log('🧪 Testing Mobile App OTP Flow\n');
  
  // Test what the mobile app would send
  const userInput = '0759001048';  // What user enters
  const apiFormat = userInput.startsWith('0') ? '254' + userInput.substring(1) : userInput;
  
  console.log(`📱 User enters: ${userInput}`);
  console.log(`🔗 App converts to: ${apiFormat}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/send-otp`, {
      phone: apiFormat
    });
    
    console.log('✅ OTP Response:', response.data);
    
    if (response.data.success) {
      console.log('\n🎉 SMS SENT SUCCESSFULLY!');
      console.log('📱 Check your phone for OTP');
      console.log('\n💡 The mobile app should work now!');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log('\n🔧 Backend might need restart');
  }
};

testMobileOTP();