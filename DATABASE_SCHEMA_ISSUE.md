# 🔧 Database Schema Issue - FOUND!

## ❌ **Issue:**
```
Database error: {
  code: '22001',
  message: 'value too long for type character varying(20)'
}
```

## 🔍 **Problem:**
- **Worker ID**: `43f0da6e-2afe-4520-920b-ca50aa033591` (36 characters)
- **Database field**: `character varying(20)` (only 20 characters)
- **UUID doesn't fit** in the database field

## ✅ **Quick Fix - Manual Complete:**

**Payment was successful** (Receipt: `THV2P64IEA`), manually complete it:

Visit: `https://ttip-backend.onrender.com/api/complete-payment/ws_CO_310820250053371721475448`

## 🔧 **Database Schema Fix Needed:**

### **Update Supabase Schema:**
```sql
-- Increase worker_id field size to accommodate UUIDs
ALTER TABLE tips ALTER COLUMN worker_id TYPE varchar(50);
ALTER TABLE workers ALTER COLUMN worker_id TYPE varchar(50);
```

### **Or Use Short Worker IDs:**
Instead of UUIDs, use shorter IDs like:
- `VG001` (Victor Gathecha 001)
- `W001`, `W002`, etc.

## 📱 **Current Status:**
- ✅ Payment successful (1 KSh paid)
- ✅ M-Pesa callback received
- ❌ Database save failed (field too short)
- 🔧 Manual completion needed

**Fix database schema or use shorter worker IDs!** 🔧📱