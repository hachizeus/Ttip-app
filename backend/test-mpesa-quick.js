import { configDotenv } from 'dotenv';
configDotenv();

async function testMpesaCredentials() {
    console.log('🧪 Testing M-Pesa Sandbox Credentials...\n');
    
    const requiredVars = ['CONSUMER_KEY', 'CONSUMER_SECRET', 'SHORT_CODE', 'PASSKEY'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        console.log('❌ Missing environment variables:', missing.join(', '));
        console.log('\nPlease update your .env file with M-Pesa credentials from:');
        console.log('https://developer.safaricom.co.ke/\n');
        return;
    }
    
    console.log('✅ All M-Pesa environment variables present');
    console.log(`   Consumer Key: ${process.env.CONSUMER_KEY.substring(0, 10)}...`);
    console.log(`   Short Code: ${process.env.SHORT_CODE}`);
    console.log(`   Base URL: ${process.env.BASE_URL}\n`);
    
    try {
        console.log('🔑 Testing M-Pesa OAuth...');
        const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
        
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: { 'Authorization': `Basic ${auth}` }
        });
        
        const data = await response.json();
        
        if (data.access_token) {
            console.log('✅ M-Pesa credentials valid!');
            console.log(`   Access token: ${data.access_token.substring(0, 20)}...`);
            console.log(`   Expires in: ${data.expires_in} seconds\n`);
            
            console.log('🎉 M-Pesa Sandbox Setup Complete!');
            console.log('\nNext steps:');
            console.log('1. Run database schema in Supabase');
            console.log('2. Start server: npm start');
            console.log('3. Test payment: http://localhost:3000/pay/WORKER001');
            
        } else {
            console.log('❌ Invalid M-Pesa credentials');
            console.log('Response:', data);
            console.log('\nPlease check your Consumer Key and Secret');
        }
        
    } catch (error) {
        console.log('❌ M-Pesa test failed:', error.message);
    }
}

testMpesaCredentials();