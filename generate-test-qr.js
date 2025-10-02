import QRCode from 'qrcode';
import fs from 'fs';

console.log('🔢 Generating Test QR Codes for Expo Go Testing\n');

const testCodes = {
  ussd: '*334*1*WHA5RGZ9I#',
  paybill: 'paybill:174379:WHA5RGZ9I',
  stk: 'https://ttip-backend.onrender.com/api/tip/WHA5RGZ9I',
  offline: JSON.stringify({
    worker_name: 'Festus',
    worker_phone: '254721475448',
    payment_methods: [
      {
        method: 'M-Pesa Send Money',
        phone: '254721475448',
        steps: ['Go to M-Pesa', 'Send Money', 'Send to 254721475448', 'Enter amount', 'Confirm with PIN']
      },
      {
        method: 'Cash',
        note: 'Hand cash directly to worker'
      }
    ]
  })
};

async function generateQRCodes() {
  for (const [type, data] of Object.entries(testCodes)) {
    try {
      // Generate PNG
      await QRCode.toFile(`${type}-qr.png`, data, {
        width: 300,
        margin: 2
      });
      
      // Generate SVG
      const svg = await QRCode.toString(data, { type: 'svg', width: 300 });
      fs.writeFileSync(`${type}-qr.svg`, svg);
      
      console.log(`✅ Generated ${type.toUpperCase()} QR code:`);
      console.log(`   Data: ${data.substring(0, 50)}${data.length > 50 ? '...' : ''}`);
      console.log(`   Files: ${type}-qr.png, ${type}-qr.svg\n`);
    } catch (error) {
      console.log(`❌ Failed to generate ${type}: ${error.message}`);
    }
  }
}

generateQRCodes().then(() => {
  console.log('🎉 All QR codes generated!');
  console.log('\n📱 How to test in Expo Go:');
  console.log('1. Open the generated PNG files on your computer');
  console.log('2. Point your phone camera at each QR code');
  console.log('3. Test the scanning functionality');
  console.log('4. Or add the test-ussd.tsx screen to your app');
  console.log('\n🔢 Manual testing:');
  console.log('• USSD: Dial *334*1*WHA5RGZ9I# on Safaricom');
  console.log('• PayBill: Business 174379, Account WHA5RGZ9I');
  console.log('• STK: Visit the URL in browser');
  console.log('• Offline: Multiple payment options');
});