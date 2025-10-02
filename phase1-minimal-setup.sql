-- TTip Phase 1 - Minimal Setup (only add missing tables)
-- Based on existing database structure

-- Add missing Phase 1 tables only
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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_tx_id ON transactions(mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_tx_id ON payouts(tx_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_worker_id ON qr_codes(worker_id);

-- Enable RLS on new tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Add policies for new tables only
CREATE POLICY "Public access transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Public access payouts" ON payouts FOR ALL USING (true);
CREATE POLICY "Public access qr_codes" ON qr_codes FOR ALL USING (true);
CREATE POLICY "Public access reviews" ON reviews FOR ALL USING (true);

-- Storage bucket (safe to run)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies with unique names
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'TTip QR Access') THEN
        CREATE POLICY "TTip QR Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'TTip QR Upload') THEN
        CREATE POLICY "TTip QR Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');
    END IF;
END
$$;