# 📱 QR Code Cache Issue - FIX

## ❌ **Issue:**
You're still seeing the old Vercel URL (`ttip-app.vercel.app`) even though the code was updated to use `http://192.168.1.3:3000/tip/`

## 🔧 **Fix Steps:**

### 1. **Restart Expo App:**
```bash
# Stop current expo (Ctrl+C)
npx expo start
```

### 2. **Restart Backend:**
```bash
cd mpesa-express-backend
npm start
```

### 3. **Clear App Cache:**
- Close TTip app completely
- Reopen TTip app
- Login again
- Open "My QR Code" modal

### 4. **Generate New QR Code:**
- The QR should now show: `http://192.168.1.3:3000/tip/W12345678`
- Test by scanning with Google camera
- Should open working web page with tip form

## ✅ **Expected Result:**
- QR contains: `http://192.168.1.3:3000/tip/W12345678`
- External scan opens web page with STK push form
- In-app scan navigates to quick-tip screen

**Restart both Expo and backend to get the updated QR code!** 🔄📱