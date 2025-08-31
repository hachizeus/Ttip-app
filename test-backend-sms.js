// Test the backend SMS service directly
const { sendOTPSMS } = require('./mpesa-express-backend/sms.mjs');

const testBackendSMS = async () => {
  console.log('🧪 Testing Backend SMS Service\n');
  
  try {
    const result = await sendOTPSMS('254759001048', '1234');
    console.log('✅ Backend SMS Result:', result);
    console.log('\n🎉 Backend SMS service working!');
    console.log('📱 Check your phone for the message');
  } catch (error) {
    console.log('❌ Backend SMS Error:', error.message);
  }
};

testBackendSMS();