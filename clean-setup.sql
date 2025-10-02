-- TTip Phase 1 - Clean Database Setup
-- Run this after checking existing structure

-- Only create tables if they don't exist
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,
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
    worker_id TEXT,
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
    tx_id uuid,
    worker_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    daraja_response JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS qr_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT,
    qr_url TEXT,
    qr_svg TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id uuid,
    worker_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    title TEXT,
    body TEXT,
    meta JSONB,
    status TEXT DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'read')),
    created_at TIMESTAMP DEFAULT now()
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_tx_id ON transactions(mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_id ON payouts(tx_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_worker_id ON qr_codes(worker_id);

-- Enable RLS (safe to run multiple times)
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow all operations on workers') THEN
        CREATE POLICY "Allow all operations on workers" ON workers FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow all operations on transactions') THEN
        CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payouts' AND policyname = 'Allow all operations on payouts') THEN
        CREATE POLICY "Allow all operations on payouts" ON payouts FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'qr_codes' AND policyname = 'Allow all operations on qr_codes') THEN
        CREATE POLICY "Allow all operations on qr_codes" ON qr_codes FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Allow all operations on reviews') THEN
        CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow all operations on notifications') THEN
        CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);
    END IF;
END
$$;

-- Create storage bucket only if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'TTip QR Public Access') THEN
        CREATE POLICY "TTip QR Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'TTip QR Public Upload') THEN
        CREATE POLICY "TTip QR Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');
    END IF;
END
$$;

-- Insert test data
INSERT INTO workers (id, name, phone, occupation) VALUES 
('WORKER001', 'John Doe', '+254712345678', 'Bartender'),
('WORKER002', 'Jane Smith', '+254723456789', 'Waiter')
ON CONFLICT (id) DO NOTHING;