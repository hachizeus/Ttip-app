# 🔍 Check Render Logs for STK Push Error

## 📋 **Steps to Debug:**

### 1. **Wait for Redeploy:**
- Render is redeploying with detailed logging
- Wait for "Deploy successful" message

### 2. **Check Render Logs:**
- Go to Render Dashboard
- Select ttip-backend service
- Click "Logs" tab
- Keep logs open

### 3. **Test STK Push:**
- Visit: https://ttip-app.onrender.com/tip/W12345678
- Enter amount: 100
- Enter phone: 0721475448
- Click "Send STK Push"

### 4. **Check Logs for:**
```
Web tip request: {workerID: "W12345678", amount: "100", phone: "0721475448"}
Environment check: {hasConsumerKey: true, hasConsumerSecret: true, ...}
Formatted phone: 254721475448
Payment response: {...}
Web tip error details: {...}
```

### 5. **Common Errors:**
- Invalid credentials
- Network timeout
- Wrong callback URL
- M-Pesa API down

**Check Render logs after testing to see the exact error!** 🔍📱