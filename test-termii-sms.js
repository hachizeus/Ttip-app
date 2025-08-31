const axios = require('axios');

const TERMII_API_KEY = 'TLOqcDmWPfujtChtXlJBOZncdWdkcMbdLSUhzFLRgMJTSgUNZiaBIsQsHqzetv';
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';

const testTermiiSMS = async () => {
  console.log('🧪 Testing Termii SMS Service\n');
  
  const testPhone = '+254759001048';
  const testMessage = 'Your Ttip login code is 1234. Expires in 5 minutes.';
  
  console.log(`📱 Sending to: ${testPhone}`);
  console.log(`💬 Message: ${testMessage}\n`);
  
  try {
    const result = await axios.post(`${TERMII_BASE_URL}/sms/send`, {
      to: testPhone,
      from: 'Termii',
      sms: testMessage,
      type: 'plain',
      api_key: TERMII_API_KEY,
      channel: 'generic'
    });
    
    console.log('✅ Termii Response:', result.data);
    
    if (result.data.message_id) {
      console.log('\n🎉 SMS SENT SUCCESSFULLY!');
      console.log('📱 Check your phone for the message');
      console.log('💰 Cost:', result.data.balance || 'Check dashboard');
    } else {
      console.log('\n❌ SMS failed:', result.data);
    }
    
  } catch (error) {
    console.log('❌ Termii Error:', error.response?.data || error.message);
    
    if (error.response?.data?.message) {
      console.log('💡 Issue:', error.response.data.message);
    }
  }
};

testTermiiSMS();