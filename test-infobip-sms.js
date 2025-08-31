const axios = require('axios');

const INFOBIP_API_KEY = '31452a76fa854f2a28ea57e832ff03ea-904c3ac4-b9f0-4553-9a62-6c1e8cecf2a0';
const INFOBIP_BASE_URL = 'https://api.infobip.com';

const testInfobipSMS = async () => {
  console.log('🧪 Testing Infobip SMS Service\n');
  
  const testPhone = '+254759001048';
  const testMessage = 'Your Ttip login code is 1234. Expires in 5 minutes.';
  
  console.log(`📱 Sending to: ${testPhone}`);
  console.log(`💬 Message: ${testMessage}\n`);
  
  try {
    const result = await axios.post(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
      messages: [{
        from: 'TTip',
        destinations: [{
          to: testPhone
        }],
        text: testMessage
      }]
    }, {
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Infobip Response:', result.data);
    
    if (result.data.messages && result.data.messages[0].status.groupName === 'PENDING') {
      console.log('\n🎉 SMS SENT SUCCESSFULLY!');
      console.log('📱 Check your phone for the message');
      console.log('💰 Message ID:', result.data.messages[0].messageId);
    } else {
      console.log('\n❌ SMS failed:', result.data);
    }
    
  } catch (error) {
    console.log('❌ Infobip Error:', error.response?.data || error.message);
  }
};

testInfobipSMS();