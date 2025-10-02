# 🚀 TTip Phase 1 - Quick Setup

## Step 1: Database Setup (2 minutes)

### 1.1 Go to Supabase SQL Editor
1. Open your Supabase project: https://supabase.com/dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### 1.2 Run Database Schema
Copy and paste this SQL:

```sql
-- Phase 1 TTip Database Schema
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    occupation TEXT,
    profile_image_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT REFERENCES workers(id),
    qr_url TEXT,
    qr_svg TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid REFERENCES transactions(id),
    worker_id TEXT REFERENCES workers(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    title TEXT,
    body TEXT,
    meta JSONB,
    status TEXT DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'read')),
    created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_tx_id ON transactions(mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_id ON payouts(tx_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_worker_id ON qr_codes(worker_id);

-- RLS Policies (permissive for MVP)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on workers" ON workers FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on payouts" ON payouts FOR ALL USING (true);
CREATE POLICY "Allow all operations on qr_codes" ON qr_codes FOR ALL USING (true);
CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- Test data
INSERT INTO workers (id, name, phone, occupation) VALUES 
('WORKER001', 'John Doe', '+254712345678', 'Bartender'),
('WORKER002', 'Jane Smith', '+254723456789', 'Waiter')
ON CONFLICT (id) DO NOTHING;
```

### 1.3 Create Storage Bucket
Run this SQL next:

```sql
-- Storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');
```

## Step 2: M-Pesa Sandbox Setup (5 minutes)

### 2.1 Get Sandbox Credentials
1. Go to: https://developer.safaricom.co.ke/
2. Login/Register
3. Create new app: "TTip Payment System"
4. Select "Lipa Na M-Pesa Online" API
5. Copy credentials:
   - Consumer Key
   - Consumer Secret
   - Test Shortcode: `174379`
   - Passkey: `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919`

### 2.2 Update Environment Variables
Your `.env` should have:

```env
# M-Pesa Sandbox
BASE_URL=https://sandbox.safaricom.co.ke
CONSUMER_KEY=your_consumer_key_here
CONSUMER_SECRET=your_consumer_secret_here
SHORT_CODE=174379
PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919

# Supabase (already set)
SUPABASE_URL=https://cpbonffjhrckiiqbsopt.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwYm9uZmZqaHJja2lpcWJzb3B0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU2OTM4NiwiZXhwIjoyMDcyMTQ1Mzg2fQ.ywj3R1uw20Q1Bs-7t5IovFPP_rW1Ji9dXTRbXogQdtw
```

## Step 3: Deploy & Test (2 minutes)

```bash
# Deploy Phase 1
deploy-phase1.bat

# Test system
node run-test.js

# Start server
npm start
```

## Step 4: Test Payment Flow

1. **Generate QR**: Visit `http://localhost:3000/qr/WORKER001`
2. **Test Payment**: Visit `http://localhost:3000/pay/WORKER001`
3. **Admin Dashboard**: Visit `http://localhost:3000/admin`

## Sandbox Test Numbers

Use these numbers for testing:
- **Customer**: `254708374149` (Safaricom test number)
- **Amount**: Any amount between 1-70000 KSh

## ✅ Setup Complete!

Your TTip Phase 1 system is now ready for testing with:
- ✅ Database schema created
- ✅ M-Pesa sandbox configured  
- ✅ QR code generation working
- ✅ STK push payments enabled
- ✅ Auto-payout system active
- ✅ Admin dashboard available