# 🔧 Render Environment Variables - REQUIRED

## ❌ **Issue:**
"Failed to send STK push" - Missing environment variables on Render

## ✅ **Add These Environment Variables on Render:**

### **Go to Render Dashboard → Your Service → Environment**

### **M-Pesa Daraja API:**
```
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=your_mpesa_consumer_key
CONSUMER_SECRET=your_mpesa_consumer_secret
SHORT_CODE=174379
PASSKEY=your_mpesa_passkey
CALLBACK_URL=https://ttip-app.onrender.com/api/callback
B2C_TIMEOUT_URL=https://ttip-app.onrender.com/api/b2c-timeout
B2C_RESULT_URL=https://ttip-app.onrender.com/api/b2c-callback
B2C_SHORTCODE=600000
SECURITY_CREDENTIAL=your_security_credential
INITIATOR_NAME=testapi
```

### **Supabase:**
```
SUPABASE_URL=https://cpbonffjhrckiiqbsopt.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

### **Infobip SMS:**
```
INFOBIP_API_KEY=31452a76fa854f2a28ea57e832ff03ea-904c3ac4-b9f0-4553-9a62-6c1e8cecf2a0
```

## 🔄 **After Adding Variables:**
- Render will automatically redeploy
- STK push should work

**Add all environment variables to fix STK push!** 🔧📱