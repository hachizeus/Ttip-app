const axios = require('axios');

const testDaraja = async () => {
  console.log('🧪 Testing Daraja API directly\n');
  
  const consumerKey = 'g3k0DQlilvMHJQds6gKyWDAwQKHTx1WhFg1pCxHMFIlGBXTN';
  const consumerSecret = 'SwU9VAzWzaaYlKJCdq5lIzfEPtyeeZVfA2ok2VfXnU2PpjLtDqMgc0wnBTXtUVVi';
  const baseURL = 'https://sandbox.safaricom.co.ke';
  
  // Get access token
  console.log('1️⃣ Getting access token...');
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      }
    });
    
    console.log('✅ Access token obtained');
    const accessToken = tokenResponse.data.access_token;
    
    // Test STK Push
    console.log('\n2️⃣ Testing STK Push...');
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const shortcode = '174379';
    const passkey = 'hUx/+tbx9L8KU0o7yApxSqAMxBzF36BbJAkZM6lANYjbWhHKatY854CpFwYogLRTKFexlE8BJu7k0KPKtRYnVefZrJwItWjOUFajbrKEXCvENnCdasVFbmCtjFg+lkfJDrFHr/d4ss9QfYPSAdgdBnrrVlh8u/Sh7pxhr/53mgjVtrxF3GjrgVF1x2MIfBdqpL+4vAq9rk8DRAAmZ3136B9wvtHGY6xFuBErfnongLBnFAZmGLsYq+Ppa7CigNecKIEzp+WTtycym68NyE6/ZXFG8OU+a6KfwMDmX/1zlncz1HGR2z9dHrSbhUNywklOgIEXxUGAbWqANe7OD2Cumg==';
    
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: '254708374149',
      PartyB: shortcode,
      PhoneNumber: '254708374149',
      CallBackURL: 'https://cpbonffjhrckiiqbsopt.supabase.co/functions/v1/mpesa-callback',
      AccountReference: 'TEST123',
      TransactionDesc: 'Test payment',
    };
    
    const stkResponse = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });
    
    console.log('✅ STK Push Response:', stkResponse.data);
    console.log('\n📱 Check phone +254759001048 for M-Pesa prompt!');
    
  } catch (error) {
    console.log('❌ Daraja test failed:', error.response?.data || error.message);
  }
};

testDaraja();