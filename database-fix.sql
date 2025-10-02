-- TTip Phase 1 Database Schema (Fixed)
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (to fix type issues)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS workers CASCADE;

-- Workers table
CREATE TABLE workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    occupation TEXT,
    profile_image_url TEXT,
    subscription_plan TEXT DEFAULT 'free',
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Transactions table
CREATE TABLE transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_tx_id TEXT UNIQUE,
    worker_id TEXT,
    customer_number TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    gateway TEXT DEFAULT 'daraja',
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Payouts table
CREATE TABLE payouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid,
    worker_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    daraja_response JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- QR codes table
CREATE TABLE qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT,
    qr_url TEXT,
    qr_svg TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Reviews table
CREATE TABLE reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid,
    worker_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- Notifications table
CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    title TEXT,
    body TEXT,
    meta JSONB,
    status TEXT DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'read')),
    created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_transactions_mpesa_tx_id ON transactions(mpesa_tx_id);
CREATE INDEX idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX idx_payouts_tx_id ON payouts(tx_id);
CREATE INDEX idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX idx_qr_codes_worker_id ON qr_codes(worker_id);

-- RLS Policies
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
('WORKER002', 'Jane Smith', '+254723456789', 'Waiter');

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');