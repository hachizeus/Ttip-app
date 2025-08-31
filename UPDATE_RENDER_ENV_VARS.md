# 🔧 Update Render Environment Variables

## ✅ **Correct M-Pesa Configuration:**

### **Go to Render Dashboard → ttip-backend → Environment Variables:**

### **Update/Add These Variables:**
- `CONSUMER_KEY` = `Z4i4VgqbkUaByTsytyQmfMGP3pYmMk1algcbpzRVAZ0vdHgL`
- `CONSUMER_SECRET` = `GYS1n9YD6D7OnnKuHWK4FTPrLpdMyWgSmAInVikHe4KajO6IFKB1yXtoiECNkF8p`
- `SHORT_CODE` = `174379`
- `PASSKEY` = `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`
- `BASE_URL` = `https://sandbox.safaricom.co.ke`
- `CALLBACK_URL` = `https://ttip-backend.onrender.com/api/callback`

### **Also Add (if not present):**
- `SUPABASE_URL` = `https://cpbonffjhrckiiqbsopt.supabase.co`
- `SUPABASE_SERVICE_KEY` = `your_supabase_service_key`

### **Save Changes:**
- Click "Save Changes"
- Render will auto-redeploy
- Wait for "Deploy successful"

### **Test STK Push:**
- Visit: https://ttip-backend.onrender.com/tip/W12345678
- Enter amount: 1
- Enter phone: 0721475448
- Click "Send STK Push"
- Should work now!

**Update PASSKEY to the correct 64-character value on Render!** 🔧📱