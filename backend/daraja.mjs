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