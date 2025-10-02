# 🚀 TTip Phase 1 Setup Guide

## Prerequisites
- Node.js 18+ installed
- Supabase project created
- M-Pesa Daraja sandbox credentials

## Step 1: Install Dependencies

```bash
cd backend
npm install qrcode express-rate-limit
```

## Step 2: Database Setup

### 2.1 Create Tables
Run this SQL in your Supabase SQL Editor:

```sql
-- Phase 1 TTip Database Schema
-- Enhanced schema for MVP with auto-payout functionality

-- Workers table (enhanced)
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY, -- WorkerID as primary key
    user_id UUID REFERENCES auth.users(id) NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL, -- E.164 format (e.g. +2547...)
    occupation TEXT,
    profile_image_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Transactions table (C2B payments)
CREATE TABLE IF NOT EXISTS transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_tx_id TEXT UNIQUE,
    worker_id TEXT REFERENCES workers(id),
    customer_number TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    gateway TEXT DEFAULT 'daraja',
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Payouts table (B2C payments)
CREATE TABLE IF NOT EXISTS payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid REFERENCES transactions(id),
    worker_id TEXT REFERENCES workers(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    daraja_response JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT REFERENCES workers(id),
    qr_url TEXT,
    qr_svg TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid REFERENCES transactions(id),
    worker_id TEXT REFERENCES workers(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    title TEXT,
    body TEXT,
    meta JSONB,
    status TEXT DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ')),
    created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_tx_id ON transactions(mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_id ON payouts(tx_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_worker_id ON qr_codes(worker_id);

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for MVP)
CREATE POLICY "Allow all operations on workers" ON workers FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on payouts" ON payouts FOR ALL USING (true);
CREATE POLICY "Allow all operations on qr_codes" ON qr_codes FOR ALL USING (true);
CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- Sample worker data for testing
INSERT INTO workers (id, name, phone, occupation) VALUES 
('WORKER001', 'John Doe', '+254712345678', 'Bartender'),
('WORKER002', 'Jane Smith', '+254723456789', 'Waiter')
ON CONFLICT (id) DO NOTHING;
```

### 2.2 Create Storage Bucket
Run this SQL in your Supabase SQL Editor:

```sql
-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');
```

## Step 3: Environment Variables

Your `.env` file should contain:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# M-Pesa Daraja
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=your_consumer_key
CONSUMER_SECRET=your_consumer_secret
SHORT_CODE=your_shortcode
PASSKEY=your_passkey

# B2C (for payouts) - Optional for Phase 1 testing
SECURITY_CREDENTIAL=your_security_credential
INITIATOR_NAME=your_initiator_name

# App Settings
BACKEND_URL=https://your-backend-url.com
PORT=3000
```

## Step 4: Test Installation

```bash
node run-test.js
```

Expected output:
```
🧪 Running TTip Phase 1 Tests...

✅ Database connection successful
✅ Worker creation successful
✅ QR code generation successful
✅ Transaction creation successful
✅ Payout queue test successful
✅ All required environment variables present
✅ M-Pesa credentials valid

📊 Test Summary:
✅ Passed: 7
❌ Failed: 0
📈 Success Rate: 100%

🎉 All tests passed! Phase 1 is ready for deployment.
```

## Step 5: Start Server

```bash
# Development
npm run dev

# Production
npm start
```

## Step 6: Test Functionality

### 6.1 Generate QR Code
```bash
curl -X POST http://localhost:3000/generate-qr \
  -H "Content-Type: application/json" \
  -d '{"workerId": "WORKER001"}'
```

### 6.2 Test Payment Page
Visit: `http://localhost:3000/pay/WORKER001`

### 6.3 Admin Dashboard
Open: `http://localhost:3000/admin-dashboard.html`

## Step 7: Deploy to Production

### Render.com Deployment
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

### Update M-Pesa Callback URLs
In your Daraja portal, set:
- **Callback URL**: `https://your-app.onrender.com/mpesa/c2b-callback`

## 🎯 Phase 1 Features Ready

✅ **Dynamic QR Codes**: Each worker gets unique QR with M-Pesa deep link  
✅ **STK Push Integration**: Customers can pay via M-Pesa STK push  
✅ **Auto-Payout System**: Automatic B2C payouts to workers  
✅ **Admin Dashboard**: Monitor transactions and retry failed payouts  
✅ **Fallback Payment Pages**: Web-based payment for non-M-Pesa app users  

## 🚀 Ready for Phase 2

Once Phase 1 is fully functional, you can proceed to Phase 2 which will include:
- Mobile app integration
- Advanced worker analytics
- Customer review system
- Enhanced admin features
- Multi-currency support

## 🐛 Troubleshooting

### Common Issues:

1. **"Bucket not found" error**
   - Run the storage bucket SQL commands
   - Check Supabase storage permissions

2. **"Table not found" error**
   - Run the database schema SQL commands
   - Verify all tables were created

3. **M-Pesa STK Push fails**
   - Check your M-Pesa credentials
   - Verify callback URL is accessible
   - Test with Safaricom test numbers

4. **B2C Payout fails**
   - Ensure you have B2C credentials configured
   - Check your M-Pesa account has sufficient float
   - Verify security credential is correct

### Getting Help:
- Check server logs for detailed error messages
- Run the test suite to identify specific issues
- Verify all environment variables are set correctly