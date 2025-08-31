# 🧪 Test Credentials Now

## 📋 **Check These URLs:**

### 1. **Environment Check:**
https://ttip-backend.onrender.com/env-check

**Should show:**
- `consumerKeyPreview: "Z4i4Vgqbk..."`
- `consumerSecretPreview: "GYS1n9YD6..."`

### 2. **M-Pesa Credentials Test:**
https://ttip-backend.onrender.com/test-mpesa

**Should show:**
- `{"success": true, "message": "M-Pesa credentials are valid!"}`

## 🔧 **If Still Showing Old Credentials:**

### **Double-Check Render Dashboard:**
1. Go to Render Dashboard
2. Select ttip-backend service
3. Click "Environment" tab
4. Verify these exact values:
   - `CONSUMER_KEY` = `Z4i4VgqbkUaByTsytyQmfMGP3pYmMk1algcbpzRVAZ0vdHgL`
   - `CONSUMER_SECRET` = `GYS1n9YD6D7OnnKuHWK4FTPrLpdMyWgSmAInVikHe4KajO6IFKB1yXtoiECNkF8p`

### **Force Manual Deploy:**
- Click "Manual Deploy" → "Deploy latest commit"

**Check these URLs to see if credentials were actually updated!** 🧪📱