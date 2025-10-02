import axios from 'axios';
import { configDotenv } from 'dotenv';

// Load environment variables
configDotenv();

// Environment variables are automatically available on Render
const baseURL = process.env.BASE_URL || 'https://sandbox.safaricom.co.ke';
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

// Only log in development
if (process.env.NODE_ENV === 'development') {
    console.log('Daraja env check:', {
        hasBaseURL: !!baseURL,
        hasConsumerKey: !!consumerKey,
        hasConsumerSecret: !!consumerSecret
    });
}

export const getAccessToken = async () => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
            Authorization: `Basic ${auth}`,
        }
    });
    return response.data.access_token;
}

export const initiateMpesaPayment = async (phoneNumber, amount, accountReference) => {
    console.log('=== STK Push Request Start ===');
    
    const accessToken = await getAccessToken();
    console.log('Access token obtained:', accessToken ? 'YES' : 'NO');
    
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const shortcode = process.env.SHORT_CODE;
    const passkey = process.env.PASSKEY;
    
    console.log('STK Push params:', {
        shortcode,
        passkeyLength: passkey ? passkey.length : 0,
        timestamp,
        phoneNumber,
        amount
    });

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: process.env.CALLBACK_URL || 'http://localhost:3000/mpesa/c2b-callback',
        AccountReference: accountReference,
        TransactionDesc: `Pay KSh ${amount} through TTip to worker`,
    };
    
    console.log('STK Push payload:', JSON.stringify(payload, null, 2));
    console.log('Request URL:', `${baseURL}/mpesa/stkpush/v1/processrequest`);

    const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    
    console.log('STK Push response:', response.data);
    return response.data;
};

export const initiateB2CPayment = async (phoneNumber, amount, remarks = 'Tip payout') => {
    console.log('=== B2C Payment Request Start ===');
    
    const accessToken = await getAccessToken();
    console.log('B2C Access token obtained:', accessToken ? 'YES' : 'NO');
    
    const shortcode = process.env.B2C_SHORTCODE || process.env.SHORT_CODE;
    const securityCredential = process.env.SECURITY_CREDENTIAL;
    
    console.log('B2C Environment check:', {
        hasShortcode: !!shortcode,
        hasSecurityCredential: !!securityCredential,
        hasInitiatorName: !!process.env.INITIATOR_NAME,
        shortcode,
        phoneNumber,
        amount
    });
    
    if (!securityCredential) {
        throw new Error('SECURITY_CREDENTIAL environment variable is required for B2C payments');
    }

    const payload = {
        InitiatorName: process.env.INITIATOR_NAME || 'testapi',
        SecurityCredential: securityCredential,
        CommandID: 'BusinessPayment',
        Amount: amount,
        PartyA: shortcode,
        PartyB: phoneNumber,
        Remarks: remarks,
        QueueTimeOutURL: 'https://ttip-app.onrender.com/b2c-timeout',
        ResultURL: 'https://ttip-app.onrender.com/b2c-callback',
        Occasion: 'Tip payout'
    };
    
    console.log('B2C Payload:', JSON.stringify(payload, null, 2));
    console.log('B2C Request URL:', `${baseURL}/mpesa/b2c/v1/paymentrequest`);

    const response = await axios.post(`${baseURL}/mpesa/b2c/v1/paymentrequest`, payload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    
    console.log('B2C Response:', response.data);
    return response.data;
};