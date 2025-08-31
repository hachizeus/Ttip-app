const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_PHONE = '254759001048';

const testOTP = async () => {
  console.log('🧪 Testing OTP Sign-In Flow\n');
  console.log(`📱 Test Phone: ${TEST_PHONE}\n`);
  
  // Step 1: Send OTP
  console.log('1️⃣ Sending OTP...');
  try {
    const otpResponse = await axios.post(`${BASE_URL}/api/send-otp`, {
      phone: TEST_PHONE
    });
    console.log('✅ OTP Response:', otpResponse.data);
    
    if (otpResponse.data.success) {
      console.log('\n📨 OTP sent to your phone!');
      console.log('💡 Check your SMS and enter the 4-digit code below\n');
      
      // Wait for user input
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Enter the OTP you received: ', async (otp) => {
        console.log(`\n2️⃣ Verifying OTP: ${otp}...`);
        
        try {
          const verifyResponse = await axios.post(`${BASE_URL}/api/verify-otp`, {
            phone: TEST_PHONE,
            otp: otp
          });
          
          console.log('✅ Verification Response:', verifyResponse.data);
          
          if (verifyResponse.data.success) {
            console.log('\n🎉 OTP VERIFICATION SUCCESSFUL!');
            console.log('✅ User can now access the app');
          } else {
            console.log('\n❌ OTP verification failed:', verifyResponse.data.error);
          }
          
        } catch (verifyError) {
          console.log('❌ Verification request failed:', verifyError.response?.data || verifyError.message);
        }
        
        rl.close();
      });
      
    } else {
      console.log('❌ Failed to send OTP');
    }
    
  } catch (error) {
    console.log('❌ OTP send failed:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('⏰ Rate limit reached - wait 1 hour or try different number');
    }
  }
};

testOTP();