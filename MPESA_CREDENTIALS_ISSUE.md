# 🔧 M-Pesa Credentials Issue - FOUND!

## ❌ **Error Found:**
```
errorCode: '500.001.1001'
errorMessage: 'Wrong credentials'
```

## 🔍 **Issue:**
The M-Pesa Consumer Key and Consumer Secret in Render are invalid or expired.

## ✅ **Fix Steps:**

### 1. **Get New M-Pesa Credentials:**
- Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke)
- Login to your account
- Go to "My Apps" → Select your app
- Copy fresh Consumer Key and Consumer Secret

### 2. **Update Render Environment Variables:**
- Go to Render Dashboard → ttip-backend → Environment
- Update these variables with NEW values:
  - `CONSUMER_KEY` = new_consumer_key
  - `CONSUMER_SECRET` = new_consumer_secret

### 3. **Test Again:**
- Render will auto-redeploy
- Test STK push on web page
- Should work with valid credentials

## 🎯 **Root Cause:**
M-Pesa sandbox credentials expire or become invalid. Need fresh credentials from Safaricom Developer Portal.

**Get new M-Pesa credentials to fix STK push!** 🔧📱