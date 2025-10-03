-- BULLETPROOF FINAL DATABASE FIX FOR TTIP
-- Handles all edge cases and checks object types

-- ============================================================================
-- 1. DROP OLD TRIGGERS AND FUNCTIONS SAFELY
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_worker_stats ON transactions;
DROP TRIGGER IF EXISTS trigger_update_worker_stats_tips ON tips;
DROP TRIGGER IF EXISTS trigger_update_worker_stats ON tips;
DROP FUNCTION IF EXISTS update_worker_stats() CASCADE;
DROP FUNCTION IF EXISTS update_worker_stats_from_tips() CASCADE;

-- ============================================================================
-- 2. CLEAN ORPHANED DATA BEFORE ADDING CONSTRAINTS
-- ============================================================================

DELETE FROM tips WHERE worker_id NOT IN (SELECT worker_id FROM workers);
DELETE FROM reviews WHERE worker_id NOT IN (SELECT worker_id FROM workers);
DELETE FROM qr_codes WHERE worker_id NOT IN (SELECT worker_id FROM workers);
DELETE FROM transactions WHERE worker_id NOT IN (SELECT worker_id FROM workers);

-- ============================================================================
-- 3. MIGRATE TRANSACTIONS TO TIPS
-- ============================================================================

ALTER TABLE tips ADD COLUMN IF NOT EXISTS gateway text DEFAULT 'daraja';
ALTER TABLE tips ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS worker_payout numeric DEFAULT 0;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS used_referral_credit boolean DEFAULT false;

INSERT INTO tips (
    worker_id, customer_phone, amount, status, mpesa_receipt, 
    created_at, updated_at, gateway, raw_payload, commission_amount, worker_payout
)
SELECT 
    t.worker_id, t.customer_number, t.amount,
    CASE 
        WHEN t.status = 'COMPLETED' THEN 'completed'
        WHEN t.status = 'FAILED' THEN 'failed'
        ELSE 'pending'
    END,
    t.mpesa_tx_id, t.created_at, t.updated_at,
    COALESCE(t.gateway, 'daraja'), t.raw_payload,
    COALESCE(t.commission_amount, 0), COALESCE(t.worker_payout, t.amount)
FROM transactions t
LEFT JOIN tips tip ON tip.mpesa_receipt = t.mpesa_tx_id
WHERE tip.id IS NULL 
AND t.mpesa_tx_id IS NOT NULL 
AND t.worker_id IS NOT NULL
AND t.worker_id IN (SELECT worker_id FROM workers);

-- ============================================================================
-- 4. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_worker_stats_from_tips()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.mpesa_receipt IS NOT NULL AND NEW.worker_id IS NOT NULL THEN
        UPDATE workers 
        SET 
            total_tips = COALESCE((
                SELECT SUM(amount) FROM tips 
                WHERE worker_id = NEW.worker_id AND mpesa_receipt IS NOT NULL AND status = 'completed'
            ), 0),
            tip_count = COALESCE((
                SELECT COUNT(*) FROM tips 
                WHERE worker_id = NEW.worker_id AND mpesa_receipt IS NOT NULL AND status = 'completed'
            ), 0),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGER
-- ============================================================================

CREATE TRIGGER trigger_update_worker_stats_tips
    AFTER INSERT OR UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats_from_tips();

-- ============================================================================
-- 6. ADD CASCADING DELETES
-- ============================================================================

ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_worker_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_worker_id_fkey;
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_worker_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_worker_id_fkey;

ALTER TABLE tips ADD CONSTRAINT tips_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE reviews ADD CONSTRAINT reviews_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE qr_codes ADD CONSTRAINT qr_codes_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE transactions ADD CONSTRAINT transactions_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

-- ============================================================================
-- 7. FIX WORKER STATISTICS
-- ============================================================================

UPDATE workers 
SET 
    total_tips = COALESCE(stats.total_amount, 0),
    tip_count = COALESCE(stats.tip_count, 0),
    updated_at = NOW()
FROM (
    SELECT worker_id, SUM(amount) as total_amount, COUNT(*) as tip_count
    FROM tips 
    WHERE mpesa_receipt IS NOT NULL AND status = 'completed'
    GROUP BY worker_id
) stats
WHERE workers.worker_id = stats.worker_id;

UPDATE workers 
SET total_tips = 0, tip_count = 0, updated_at = NOW()
WHERE worker_id NOT IN (
    SELECT DISTINCT worker_id FROM tips 
    WHERE mpesa_receipt IS NOT NULL AND status = 'completed' AND worker_id IS NOT NULL
);

-- ============================================================================
-- 8. ADD RLS POLICIES (ONLY TO TABLES, NOT VIEWS)
-- ============================================================================

-- Enable RLS only on tables that exist
DO $$
BEGIN
    -- Workers table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workers') THEN
        ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Workers viewable by everyone" ON workers;
        CREATE POLICY "Workers viewable by everyone" ON workers FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Workers can insert" ON workers;
        CREATE POLICY "Workers can insert" ON workers FOR INSERT WITH CHECK (true);
        DROP POLICY IF EXISTS "Workers can update" ON workers;
        CREATE POLICY "Workers can update" ON workers FOR UPDATE USING (true);
        DROP POLICY IF EXISTS "Workers can delete" ON workers;
        CREATE POLICY "Workers can delete" ON workers FOR DELETE USING (true);
    END IF;

    -- Tips table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tips') THEN
        ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Tips viewable" ON tips;
        CREATE POLICY "Tips viewable" ON tips FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Tips can insert" ON tips;
        CREATE POLICY "Tips can insert" ON tips FOR INSERT WITH CHECK (true);
        DROP POLICY IF EXISTS "Tips can update" ON tips;
        CREATE POLICY "Tips can update" ON tips FOR UPDATE USING (true);
    END IF;

    -- Transactions table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Transactions viewable" ON transactions;
        CREATE POLICY "Transactions viewable" ON transactions FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Transactions can insert" ON transactions;
        CREATE POLICY "Transactions can insert" ON transactions FOR INSERT WITH CHECK (true);
        DROP POLICY IF EXISTS "Transactions can update" ON transactions;
        CREATE POLICY "Transactions can update" ON transactions FOR UPDATE USING (true);
    END IF;

    -- Reviews table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reviews') THEN
        ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Reviews viewable" ON reviews;
        CREATE POLICY "Reviews viewable" ON reviews FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Reviews can insert" ON reviews;
        CREATE POLICY "Reviews can insert" ON reviews FOR INSERT WITH CHECK (true);
    END IF;

    -- QR codes table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'qr_codes') THEN
        ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "QR codes viewable" ON qr_codes;
        CREATE POLICY "QR codes viewable" ON qr_codes FOR SELECT USING (true);
        DROP POLICY IF EXISTS "QR codes can insert" ON qr_codes;
        CREATE POLICY "QR codes can insert" ON qr_codes FOR INSERT WITH CHECK (true);
    END IF;

    -- Transaction logs table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_logs') THEN
        ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Transaction logs viewable" ON transaction_logs;
        CREATE POLICY "Transaction logs viewable" ON transaction_logs FOR SELECT USING (true);
        DROP POLICY IF EXISTS "Transaction logs can insert" ON transaction_logs;
        CREATE POLICY "Transaction logs can insert" ON transaction_logs FOR INSERT WITH CHECK (true);
    END IF;

    -- USSD mappings table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ussd_mappings') THEN
        ALTER TABLE ussd_mappings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "USSD mappings viewable" ON ussd_mappings;
        CREATE POLICY "USSD mappings viewable" ON ussd_mappings FOR SELECT USING (true);
        DROP POLICY IF EXISTS "USSD mappings can insert" ON ussd_mappings;
        CREATE POLICY "USSD mappings can insert" ON ussd_mappings FOR INSERT WITH CHECK (true);
    END IF;

    -- USSD QR codes table
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ussd_qr_codes') THEN
        ALTER TABLE ussd_qr_codes ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "USSD QR codes viewable" ON ussd_qr_codes;
        CREATE POLICY "USSD QR codes viewable" ON ussd_qr_codes FOR SELECT USING (true);
        DROP POLICY IF EXISTS "USSD QR codes can insert" ON ussd_qr_codes;
        CREATE POLICY "USSD QR codes can insert" ON ussd_qr_codes FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- 9. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tips_worker_id ON tips(worker_id);
CREATE INDEX IF NOT EXISTS idx_tips_mpesa_receipt ON tips(mpesa_receipt);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- ============================================================================
-- 10. CREATE ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW worker_analytics AS
SELECT 
    w.worker_id,
    w.name,
    w.phone,
    w.total_tips,
    w.tip_count,
    w.created_at as worker_created_at,
    COALESCE(recent.recent_tips, 0) as tips_last_7_days,
    COALESCE(recent.recent_count, 0) as tips_last_7_days_count,
    CASE 
        WHEN w.tip_count > 0 THEN w.total_tips / w.tip_count 
        ELSE 0 
    END as average_tip_amount
FROM workers w
LEFT JOIN (
    SELECT 
        worker_id,
        SUM(amount) as recent_tips,
        COUNT(*) as recent_count
    FROM tips 
    WHERE mpesa_receipt IS NOT NULL 
    AND status = 'completed'
    AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY worker_id
) recent ON w.worker_id = recent.worker_id;

-- ============================================================================
-- 11. VERIFICATION
-- ============================================================================

SELECT 
    w.worker_id,
    w.name,
    w.total_tips as db_total,
    w.tip_count as db_count,
    COALESCE(t.actual_total, 0) as calculated_total,
    COALESCE(t.actual_count, 0) as calculated_count,
    CASE 
        WHEN w.total_tips = COALESCE(t.actual_total, 0) AND w.tip_count = COALESCE(t.actual_count, 0) 
        THEN 'CORRECT' 
        ELSE 'MISMATCH' 
    END as status
FROM workers w
LEFT JOIN (
    SELECT 
        worker_id,
        SUM(amount) as actual_total,
        COUNT(*) as actual_count
    FROM tips 
    WHERE mpesa_receipt IS NOT NULL AND status = 'completed'
    GROUP BY worker_id
) t ON w.worker_id = t.worker_id
ORDER BY w.total_tips DESC;

SELECT 'BULLETPROOF DATABASE FIX COMPLETED' as status;