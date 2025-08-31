const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const LOCAL_PHONE = '0759001048'; // Local format
const API_PHONE = '254759001048';  // API format

const testOTPLocalFormat = async () => {
  console.log('🧪 Testing OTP with Local Phone Format\n');
  console.log(`📱 User enters: ${LOCAL_PHONE}`);
  console.log(`🔗 API receives: ${API_PHONE}\n`);
  
  // Test health
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend Status:', health.data.status);
  } catch (error) {
    console.log('❌ Backend not running');
    return;
  }
  
  // Test OTP send with API format
  console.log('\n1️⃣ Sending OTP to API format phone...');
  try {
    const otpResponse = await axios.post(`${BASE_URL}/api/send-otp`, {
      phone: API_PHONE
    });
    
    if (otpResponse.data.success) {
      console.log('✅ OTP sent successfully!');
      console.log('📱 Check your phone for SMS');
      
      // Interactive OTP verification
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('\nEnter the 4-digit OTP you received: ', async (otp) => {
        console.log(`\n2️⃣ Verifying OTP: ${otp}`);
        
        try {
          const verifyResponse = await axios.post(`${BASE_URL}/api/verify-otp`, {
            phone: API_PHONE,
            otp: otp
          });
          
          if (verifyResponse.data.success) {
            console.log('\n🎉 OTP VERIFICATION SUCCESSFUL!');
            console.log('✅ Local phone format system working!');
            console.log('📱 Users can enter: 0759001048');
            console.log('🔗 System converts to: 254759001048');
            console.log('📨 SMS sent to: +254759001048');
          } else {
            console.log('\n❌ OTP verification failed:', verifyResponse.data.error);
          }
          
        } catch (verifyError) {
          console.log('❌ Verification error:', verifyError.response?.data || verifyError.message);
        }
        
        rl.close();
      });
      
    } else {
      console.log('❌ OTP send failed');
    }
    
  } catch (error) {
    console.log('❌ OTP request failed:', error.response?.data || error.message);
  }
};

testOTPLocalFormat();