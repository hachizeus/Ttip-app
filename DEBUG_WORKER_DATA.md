# 🔍 Debug Worker Data Issue

## ❌ **Issues:**
1. QR code shows "TEST1756572740273" instead of real worker ID
2. Home page shows "test worker" instead of real name

## 🔧 **Debug Steps:**

### 1. **Check Database:**
- Open Supabase dashboard
- Go to Table Editor → workers table
- Check if your phone number has correct data

### 2. **Check Console Logs:**
```bash
npx expo start
```
- Open app and check console for:
  - "Fetching worker data for phone: +254..."
  - "Worker data result: {...}"

### 3. **Verify Phone Format:**
- Login phone: `0759001048`
- Should be stored as: `+254759001048`
- Check if formats match

### 4. **Test Worker Registration:**
- Go to Profile → "Become a Worker"
- Register with same phone number
- Check if data appears correctly

## 🎯 **Expected Result:**
- Home shows your real name
- QR code contains your real worker ID
- Database has matching phone number

**Check console logs and database to identify the mismatch!** 🔍📱