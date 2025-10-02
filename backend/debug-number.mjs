import axios from 'axios';
import { configDotenv } from 'dotenv';

configDotenv();

const baseURL = process.env.BASE_URL;
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;

const getAccessToken = async () => {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
    });
    return response.data.access_token;
};

async function debugNumber() {
    try {
        console.log('🔍 Debugging your phone number...');
        
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
        const shortcode = process.env.SHORT_CODE;
        const passkey = process.env.PASSKEY;
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        const phoneNumber = '254759001048';
        
        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: 1,
            PartyA: phoneNumber,
            PartyB: shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: 'TEST',
            TransactionDesc: 'Test payment',
        };
        
        console.log('📋 Request details:');
        console.log('URL:', `${baseURL}/mpesa/stkpush/v1/processrequest`);
        console.log('Phone:', phoneNumber);
        console.log('Shortcode:', shortcode);
        console.log('Callback:', process.env.CALLBACK_URL);
        
        const response = await axios.post(`${baseURL}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        console.log('\n✅ Success:', response.data);
        
    } catch (error) {
        console.log('\n❌ Error details:');
        console.log('Status:', error.response?.status);
        console.log('Data:', error.response?.data);
        console.log('Message:', error.message);
        
        if (error.response?.data) {
            const errorData = error.response.data;
            if (errorData.errorMessage?.includes('invalid phone number')) {
                console.log('\n💡 Phone number format issue detected');
            } else if (errorData.errorMessage?.includes('insufficient funds')) {
                console.log('\n💡 Paybill account issue');
            }
        }
    }
}

debugNumber();