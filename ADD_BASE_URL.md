# 🔧 Add Missing BASE_URL Environment Variable

## ❌ **Missing Variable:**
`BASE_URL` is not set in Render environment variables

## ✅ **Add This Variable:**

### **Go to Render Dashboard → Environment Variables → Add:**

**KEY:** `BASE_URL`
**VALUE:** `https://sandbox.safaricom.co.ke`

## 🔄 **After Adding:**
- Render will automatically redeploy
- STK push should work

## 🧪 **Test Again:**
1. Visit: `https://ttip-app.onrender.com/env-check`
2. Should show: `"baseUrl": "https://sandbox.safaricom.co.ke"`
3. Test STK push on web page

**Add BASE_URL environment variable to fix M-Pesa API calls!** 🔧📱