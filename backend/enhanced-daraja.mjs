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
    
    // Format phone number properly for M-Pesa (handle 10-digit input)
    let formattedPhone = phoneNumber.toString().replace(/\D/g, ''); // Remove non-digits
    
    if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
        formattedPhone = '254' + formattedPhone.substring(1); // Replace leading 0 with 254
    } else if (formattedPhone.startsWith('254') && formattedPhone.length === 12) {
        // Already in correct format
    } else if ((formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) && formattedPhone.length === 9) {
        formattedPhone = '254' + formattedPhone; // Add 254 prefix for 9-digit
    } else if ((formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) && formattedPhone.length === 10) {
        formattedPhone = '254' + formattedPhone; // Add 254 prefix for 10-digit without leading 0
    } else if (formattedPhone.length === 10 && !formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone; // Handle any 10-digit number
    }
    
    console.log('STK Push params:', {
        shortcode,
        passkeyLength: passkey ? passkey.length : 0,
        timestamp,
        originalPhone: phoneNumber,
        formattedPhone,
        amount
    });

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: parseInt(amount),
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: accountReference || 'TTip',
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

export const queryPaymentStatus = async (checkoutRequestId) => {
    console.log('=== Querying Payment Status ===');
    
    const accessToken = await getAccessToken();
    const shortcode = process.env.SHORT_CODE;
    const passkey = process.env.PASSKEY;
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
    };
    
    try {
        const response = await axios.post(`${baseURL}/mpesa/stkpushquery/v1/query`, payload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            }
        });
        
        console.log('Query response:', response.data);
        
        if (response.data.ResultCode === '0') {
            return { status: 'SUCCESS', data: response.data };
        } else if (response.data.ResultCode === '4999') {
            return { status: 'PENDING', data: response.data };
        } else {
            return { status: 'FAILED', data: response.data };
        }
    } catch (error) {
        console.error('Query error:', error.message);
        return { status: 'PENDING', error: error.message };
    }
};