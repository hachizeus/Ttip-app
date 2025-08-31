// Test Africa's Talking SMS directly
const AfricasTalking = require('africastalking');

const africastalking = AfricasTalking({
    apiKey: 'atsk_76d46635869ba4eb7fcec9c71ed9dc7e04caafa06ebc8216f1aab99738407c53ecc80f85',
    username: 'sandbox'
});

const sms = africastalking.SMS;

const testSMSDirect = async () => {
    console.log('🧪 Testing Africa\'s Talking SMS Direct\n');
    
    const testOTP = '1234';
    const testPhone = '+254759001048';
    const message = `Your Ttip login code is ${testOTP}. Expires in 5 minutes.`;
    
    console.log(`📱 Sending to: ${testPhone}`);
    console.log(`💬 Message: ${message}\n`);
    
    try {
        const result = await sms.send({
            to: testPhone,
            message: message
        });
        
        console.log('✅ SMS Result:', result);
        
        if (result.SMSMessageData.Recipients[0].status === 'Success') {
            console.log('\n🎉 SMS SENT SUCCESSFULLY!');
            console.log('📱 Check your phone for the message');
        } else {
            console.log('\n❌ SMS failed:', result.SMSMessageData.Recipients[0]);
        }
        
    } catch (error) {
        console.log('❌ SMS Error:', error.message);
        
        if (error.message.includes('insufficient')) {
            console.log('💰 Issue: Insufficient SMS credits in Africa\'s Talking account');
        } else if (error.message.includes('authentication')) {
            console.log('🔑 Issue: Invalid API key or username');
        }
    }
};

testSMSDirect();