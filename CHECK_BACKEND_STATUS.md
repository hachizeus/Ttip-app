# 🔍 Check Backend Status

## 📋 **Debug Steps:**

### 1. **Check Environment Variables:**
Visit: https://ttip-app.onrender.com/env-check

Should show:
```json
{
  "hasConsumerKey": true,
  "hasConsumerSecret": true,
  "hasShortCode": true,
  "hasPasskey": true,
  "hasSupabaseUrl": true,
  "hasSupabaseKey": true,
  "baseUrl": "https://sandbox.safaricom.co.ke"
}
```

### 2. **Check Health:**
Visit: https://ttip-app.onrender.com/health

### 3. **Test Web Tip:**
Visit: https://ttip-app.onrender.com/tip/W12345678
- Enter amount: 1
- Enter phone: 0759001048
- Click "Send STK Push"
- Check browser console for errors

### 4. **Check Render Logs:**
- Go to Render dashboard
- Select ttip-backend service
- Click "Logs" tab
- Look for error messages

## 🔧 **Common Issues:**
- Missing environment variables
- Invalid M-Pesa credentials
- Wrong callback URLs
- Network timeout

**Check these URLs to identify the exact error!** 🔍📱