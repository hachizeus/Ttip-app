import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.BASE_URL;
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

const getAccessToken = async () => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
            Authorization: `Basic ${auth}`,
        }
    });
    return response.data.access_token;
};

export const initiateMpesaPayment = async (phoneNumber, amount) => {
    const accessToken = await getAccessToken();
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
    
    console.log(`Original phone: ${phoneNumber}, Formatted: ${formattedPhone}`);

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
        AccountReference: 'TTip',
        TransactionDesc: 'Payment for services',
    };

    const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        }
    });
    
    return response.data;
};

export const queryPaymentStatus = async (checkoutRequestId) => {
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
        
        if (response.data.ResultCode === '0') {
            return { status: 'SUCCESS', data: response.data };
        } else if (response.data.ResultCode === '4999') {
            return { status: 'PENDING', data: response.data };
        } else {
            return { status: 'FAILED', data: response.data };
        }
    } catch (error) {
        return { status: 'PENDING', error: error.message };
    }
};