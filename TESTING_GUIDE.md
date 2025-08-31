# TTip Testing Guide

## Quick Test Setup

### 1. Run Database Schema
Go to Supabase → SQL Editor → Paste `production-schema.sql`

### 2. Start Tests
```bash
# Option 1: Run batch file
run-tests.bat

# Option 2: Manual testing
cd mpesa-express-backend
npm start

# New terminal
node test-supabase.js
node test-script.js
```

## Test Scenarios

### 📱 Phone: +254759001048

### Test 1: Database (Supabase)
- ✅ Create worker
- ✅ Fetch worker data  
- ✅ Create tip transaction
- ✅ Update worker stats
- ✅ Fetch leaderboard

### Test 2: Authentication (OTP)
- ✅ Send OTP to +254759001048
- ✅ Verify OTP code
- ✅ Rate limiting (3 requests/hour)

### Test 3: M-Pesa Payment
- ✅ Initiate STK push
- ✅ Test with KSh 10
- ✅ Account reference: TEST123

### Test 4: SMS Notifications
- ✅ Tip notification messages
- ✅ Random positive messages
- ✅ Africa's Talking integration

## Expected Results

### OTP SMS:
"Your Ttip login code is 1234. Expires in 5 minutes."

### Tip SMS:
"🎉 You've received KSh 100 via Ttip. Great service today 👏"

### M-Pesa STK:
Payment request appears on +254759001048

## Troubleshooting

### Backend not starting:
```bash
cd mpesa-express-backend
npm install
npm start
```

### Supabase connection failed:
- Check .env file has correct URL/keys
- Verify schema is created

### SMS not received:
- Check Africa's Talking credits
- Verify phone number format (254...)

### M-Pesa failed:
- Use sandbox test number: 254708374149
- Check Daraja API credentials

## Test Phone Numbers

- **Your Phone**: +254759001048 (for OTP/SMS)
- **M-Pesa Test**: +254708374149 (Safaricom sandbox)

Run tests and verify each functionality works!