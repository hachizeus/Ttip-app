# 📱 Testing USSD & Offline QR Codes in Expo Go

## Quick Setup

1. **Start your app:**
   ```bash
   cd TTip
   npx expo start
   ```

2. **Open Expo Go** on your phone and scan the QR code

## 🔢 Testing USSD QR Codes

### Method 1: Use Built-in QR Scanner
1. Open your TTip app in Expo Go
2. Go to **QR Scanner** screen
3. Point camera at any QR code from our test results:
   - **USSD Code**: `*334*1*WHA5RGZ9I#`
   - **PayBill**: `paybill:174379:WHA5RGZ9I`
   - **Offline Instructions**: JSON with payment methods

### Method 2: Generate Test QR Codes
1. Go to any worker profile in your app
2. Look for **QR Code** or **Tip** button
3. The app should show different QR types:
   - 📱 **Standard**: STK Push (requires internet)
   - 🔢 **USSD**: Works on any phone
   - 🏪 **PayBill**: Manual M-Pesa
   - 📴 **Offline**: Multiple payment options

## 🧪 Test Scenarios

### Scenario 1: Smartphone User (STK Push)
```
1. Scan QR code in app
2. Enter tip amount
3. Get M-Pesa STK push notification
4. Enter PIN to complete
```

### Scenario 2: Feature Phone User (USSD)
```
1. Scan USSD QR code
2. Or manually dial: *334*1*WORKER_ID#
3. Follow USSD prompts
4. Enter amount and PIN
```

### Scenario 3: Manual PayBill
```
1. Scan PayBill QR code
2. Or go to M-Pesa → Pay Bill
3. Business Number: 174379
4. Account: WORKER_ID
5. Enter amount and PIN
```

### Scenario 4: Offline Payment
```
1. Scan Offline QR code
2. Choose payment method:
   - Send Money to worker's phone
   - Bank transfer
   - Cash payment
```

## 📋 What to Test in Expo Go

### 1. QR Code Generation
- Navigate to worker profile
- Check if QR codes are generated
- Verify different QR types are available

### 2. QR Code Scanning
- Use camera to scan QR codes
- Check if instructions appear
- Verify payment flow starts

### 3. Payment Instructions
- Scan each QR type
- Check if clear instructions show
- Verify contact details are correct

### 4. Offline Functionality
- Test without internet connection
- USSD codes should still work
- Offline instructions should display

## 🔍 Debug Steps

### If QR codes don't appear:
1. Check if worker has `worker_id`
2. Verify backend is running
3. Check network connection

### If scanning doesn't work:
1. Ensure camera permissions
2. Try better lighting
3. Hold phone steady

### If payment fails:
1. Check M-Pesa credentials in backend
2. Verify phone number format
3. Test with small amounts first

## 📱 Real Phone Testing

### Test with actual M-Pesa:
1. Use real Kenyan phone number
2. Have M-Pesa account with funds
3. Test with KES 1 first
4. Use Safaricom test numbers: `254708374149`

### USSD Testing:
1. Dial the USSD code manually
2. Should work on any Safaricom line
3. No internet required
4. Works on feature phones

## 🎯 Expected Results

✅ **Working correctly:**
- QR codes generate for workers
- Camera scans QR codes
- Instructions display clearly
- Payment flows initiate
- USSD codes work offline

❌ **Common issues:**
- Camera permission denied
- QR codes not generating
- Backend not responding
- M-Pesa credentials invalid

## 🚀 Quick Test Commands

```bash
# Start the app
npx expo start

# Test backend is running
curl https://ttip-backend.onrender.com/api/health

# Check if worker has QR codes
# (Use browser to visit)
https://ttip-backend.onrender.com/api/worker/WHA5RGZ9I/qr-codes
```

## 📞 Test Phone Numbers

- **Test M-Pesa**: `254708374149`
- **Your number**: Use your actual Safaricom number
- **Worker phone**: Any valid Kenyan number

## 💡 Pro Tips

1. **Test offline first** - USSD codes work without internet
2. **Use small amounts** - Start with KES 1-10
3. **Check both cameras** - Front and back camera
4. **Test in good lighting** - QR codes need clear visibility
5. **Have M-Pesa ready** - Ensure you have funds and PIN

---

**Ready to test?** Open Expo Go and start scanning! 📱✨