# 🔧 Update M-Pesa Credentials on Render

## ✅ **Fresh Credentials from Safaricom:**
- Consumer Key: `g3k0DQlilvMHJQds6gKyWDAwQKHTx1WhFg1pCxHMFIlGBXTN`
- Consumer Secret: `SwU9VAzWzaaYlKJCdq5lIzfEPtyeeZVfA2ok2VfXnU2PpjLtDqMgc0wnBTXtUVVi`

## 📋 **Update on Render:**

### 1. **Go to Render Dashboard:**
- Select ttip-backend service
- Click "Environment" tab

### 2. **Update These Variables:**
- **CONSUMER_KEY**: `g3k0DQlilvMHJQds6gKyWDAwQKHTx1WhFg1pCxHMFIlGBXTN`
- **CONSUMER_SECRET**: `SwU9VAzWzaaYlKJCdq5lIzfEPtyeeZVfA2ok2VfXnU2PpjLtDqMgc0wnBTXtUVVi`

### 3. **Save Changes:**
- Render will automatically redeploy
- Wait for "Deploy successful" message

### 4. **Test STK Push:**
- Visit: https://ttip-backend.onrender.com/tip/W12345678
- Enter amount: 1
- Enter phone: 0721475448
- Click "Send STK Push"
- Should work now!

**Update these credentials on Render to fix STK push!** 🔧📱