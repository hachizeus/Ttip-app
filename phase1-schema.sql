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