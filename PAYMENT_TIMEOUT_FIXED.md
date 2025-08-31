# 🔧 Payment Timeout Issues - FIXED

## ❌ **Issue:**
- Payment shows "timeout" after 60 seconds
- Money deducted but not appearing in database
- M-Pesa callback processing slower than expected

## ✅ **Fixes Applied:**

### **Extended Timeout:**
- **Before**: 60 seconds (too short)
- **Now**: 3 minutes (180 seconds)
- **Status checks**: Every 2 seconds for 90 checks

### **Better Error Message:**
- **Before**: "Payment timeout. Please check your phone or try again."
- **Now**: "Payment processing taking longer than expected. Please wait or contact support if money was deducted."

### **Hidden Worker ID:**
- **Before**: Shows "Worker ID: VG001"
- **Now**: Shows "Tip for: Cook"

## 🔧 **For Existing Deducted Payment:**

### **Check Transaction Status:**
Visit: `https://ttip-backend.onrender.com/api/payment-status/[YOUR_CHECKOUT_ID]`

### **Manual Complete if Needed:**
Visit: `https://ttip-backend.onrender.com/api/complete-payment/[YOUR_CHECKOUT_ID]`

## 📱 **Root Cause:**
M-Pesa sandbox can be slow, taking 1-2 minutes to send callbacks. The 60-second timeout was too aggressive.

## 🧪 **Test Again:**
- Payment now waits 3 minutes
- Better handles slow M-Pesa responses
- Shows appropriate messages

**Payment timeout extended to 3 minutes to handle slow M-Pesa callbacks!** ⏰📱💰