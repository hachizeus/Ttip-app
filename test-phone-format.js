const { formatPhoneForAPI, formatPhoneForSMS, formatPhoneForDisplay, validateKenyanPhone } = require('./lib/phone-utils.ts');

console.log('🧪 Testing Phone Format Utilities\n');

const testNumbers = [
  '0712345678',
  '0759001048', 
  '254712345678',
  '+254712345678',
  '712345678'
];

testNumbers.forEach(phone => {
  console.log(`📱 Input: ${phone}`);
  console.log(`   Display: ${formatPhoneForDisplay(phone)}`);
  console.log(`   API: ${formatPhoneForAPI(phone)}`);
  console.log(`   SMS: ${formatPhoneForSMS(phone)}`);
  console.log(`   Valid: ${validateKenyanPhone(phone)}`);
  console.log('');
});

console.log('✅ Phone format utilities ready!');
console.log('📱 Users enter: 0712345678');
console.log('🔗 APIs receive: 254712345678');
console.log('📨 SMS sends to: +254712345678');