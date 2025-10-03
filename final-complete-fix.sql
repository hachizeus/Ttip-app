-- FINAL COMPLETE DATABASE FIX FOR TTIP
-- Fix trigger error and add cascading deletes

-- ============================================================================
-- 1. DROP ALL OLD TRIGGERS AND FUNCTIONS WITH CASCADE
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_worker_stats ON transactions;
DROP TRIGGER IF EXISTS trigger_update_worker_stats_tips ON tips;
DROP TRIGGER IF EXISTS trigger_update_worker_stats ON tips;

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS update_worker_stats() CASCADE;
DROP FUNCTION IF EXISTS update_worker_stats_from_tips() CASCADE;

-- ============================================================================
-- 2. MIGRATE TRANSACTIONS DATA TO TIPS TABLE
-- ============================================================================

ALTER TABLE tips ADD COLUMN IF NOT EXISTS gateway text DEFAULT 'daraja';
ALTER TABLE tips ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS worker_payout numeric DEFAULT 0;
ALTER TABLE tips ADD COLUMN IF NOT EXISTS used_referral_credit boolean DEFAULT false;

INSERT INTO tips (
    worker_id, 
    customer_phone, 
    amount, 
    status, 
    mpesa_receipt, 
    created_at, 
    updated_at,
    gateway,
    raw_payload,
    commission_amount,
    worker_payout
)
SELECT 
    t.worker_id,
    t.customer_number,
    t.amount,
    CASE 
        WHEN t.status = 'COMPLETED' THEN 'completed'
        WHEN t.status = 'FAILED' THEN 'failed'
        ELSE 'pending'
    END,
    t.mpesa_tx_id,
    t.created_at,
    t.updated_at,
    COALESCE(t.gateway, 'daraja'),
    t.raw_payload,
    COALESCE(t.commission_amount, 0),
    COALESCE(t.worker_payout, t.amount)
FROM transactions t
LEFT JOIN tips tip ON tip.mpesa_receipt = t.mpesa_tx_id
WHERE tip.id IS NULL 
AND t.mpesa_tx_id IS NOT NULL
AND t.worker_id IS NOT NULL;

-- ============================================================================
-- 3. CREATE CORRECT TRIGGER FUNCTION FOR TIPS TABLE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_worker_stats_from_tips()
RETURNS TRIGGER AS $$
BEGIN
    -- Update worker statistics when tip is completed (has mpesa_receipt)
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.mpesa_receipt IS NOT NULL AND NEW.worker_id IS NOT NULL THEN
        UPDATE workers 
        SET 
            total_tips = COALESCE((
                SELECT SUM(amount) 
                FROM tips 
                WHERE worker_id = NEW.worker_id 
                AND mpesa_receipt IS NOT NULL
                AND status = 'completed'
            ), 0),
            tip_count = COALESCE((
                SELECT COUNT(*) 
                FROM tips 
                WHERE worker_id = NEW.worker_id 
                AND mpesa_receipt IS NOT NULL
                AND status = 'completed'
            ), 0),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE TRIGGER FOR TIPS TABLE
-- ============================================================================

CREATE TRIGGER trigger_update_worker_stats_tips
    AFTER INSERT OR UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats_from_tips();

-- ============================================================================
-- 5. ADD CASCADING DELETE CONSTRAINTS
-- ============================================================================

-- Drop existing foreign keys
ALTER TABLE tips DROP CONSTRAINT IF EXISTS tips_worker_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_worker_id_fkey;
ALTER TABLE qr_codes DROP CONSTRAINT IF EXISTS qr_codes_worker_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_worker_id_fkey;
ALTER TABLE ussd_mappings DROP CONSTRAINT IF EXISTS ussd_mappings_worker_id_fkey;
ALTER TABLE ussd_qr_codes DROP CONSTRAINT IF EXISTS ussd_qr_codes_worker_id_fkey;

-- Add cascading delete foreign keys
ALTER TABLE tips 
ADD CONSTRAINT tips_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE reviews 
ADD CONSTRAINT reviews_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE qr_codes 
ADD CONSTRAINT qr_codes_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE;

-- For UUID foreign keys, check if they exist first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ussd_mappings' AND column_name = 'worker_id' AND data_type = 'uuid') THEN
        ALTER TABLE ussd_mappings 
        ADD CONSTRAINT ussd_mappings_worker_id_fkey 
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ussd_qr_codes' AND column_name = 'worker_id' AND data_type = 'uuid') THEN
        ALTER TABLE ussd_qr_codes 
        ADD CONSTRAINT ussd_qr_codes_worker_id_fkey 
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 6. FIX CURRENT WORKER STATISTICS FROM TIPS
-- ============================================================================

UPDATE workers 
SET 
    total_tips = COALESCE(stats.total_amount, 0),
    tip_count = COALESCE(stats.tip_count, 0),
    updated_at = NOW()
FROM (
    SELECT 
        worker_id,
        SUM(amount) as total_amount,
        COUNT(*) as tip_count
    FROM tips 
    WHERE mpesa_receipt IS NOT NULL
    AND status = 'completed'
    GROUP BY worker_id
) stats
WHERE workers.worker_id = stats.worker_id;

UPDATE workers 
SET 
    total_tips = 0,
    tip_count = 0,
    updated_at = NOW()
WHERE worker_id NOT IN (
    SELECT DISTINCT worker_id 
    FROM tips 
    WHERE mpesa_receipt IS NOT NULL
    AND status = 'completed'
    AND worker_id IS NOT NULL
);

-- ============================================================================
-- 7. ADD RLS POLICIES TO ALL TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ussd_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ussd_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_stats ENABLE ROW LEVEL SECURITY;

-- Workers policies
DROP POLICY IF EXISTS "Workers viewable by everyone" ON workers;
CREATE POLICY "Workers viewable by everyone" ON workers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workers can insert" ON workers;
CREATE POLICY "Workers can insert" ON workers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Workers can update" ON workers;
CREATE POLICY "Workers can update" ON workers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Workers can delete" ON workers;
CREATE POLICY "Workers can delete" ON workers FOR DELETE USING (true);

-- Tips policies
DROP POLICY IF EXISTS "Tips viewable" ON tips;
CREATE POLICY "Tips viewable" ON tips FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tips can insert" ON tips;
CREATE POLICY "Tips can insert" ON tips FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Tips can update" ON tips;
CREATE POLICY "Tips can update" ON tips FOR UPDATE USING (true);

-- Transactions policies
DROP POLICY IF EXISTS "Transactions viewable" ON transactions;
CREATE POLICY "Transactions viewable" ON transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transactions can insert" ON transactions;
CREATE POLICY "Transactions can insert" ON transactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Transactions can update" ON transactions;
CREATE POLICY "Transactions can update" ON transactions FOR UPDATE USING (true);

-- Reviews policies
DROP POLICY IF EXISTS "Reviews viewable" ON reviews;
CREATE POLICY "Reviews viewable" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reviews can insert" ON reviews;
CREATE POLICY "Reviews can insert" ON reviews FOR INSERT WITH CHECK (true);

-- QR codes policies
DROP POLICY IF EXISTS "QR codes viewable" ON qr_codes;
CREATE POLICY "QR codes viewable" ON qr_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "QR codes can insert" ON qr_codes;
CREATE POLICY "QR codes can insert" ON qr_codes FOR INSERT WITH CHECK (true);

-- Other table policies
DROP POLICY IF EXISTS "Transaction logs viewable" ON transaction_logs;
CREATE POLICY "Transaction logs viewable" ON transaction_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transaction logs can insert" ON transaction_logs;
CREATE POLICY "Transaction logs can insert" ON transaction_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "USSD mappings viewable" ON ussd_mappings;
CREATE POLICY "USSD mappings viewable" ON ussd_mappings FOR SELECT USING (true);

DROP POLICY IF EXISTS "USSD mappings can insert" ON ussd_mappings;
CREATE POLICY "USSD mappings can insert" ON ussd_mappings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "USSD QR codes viewable" ON ussd_qr_codes;
CREATE POLICY "USSD QR codes viewable" ON ussd_qr_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "USSD QR codes can insert" ON ussd_qr_codes;
CREATE POLICY "USSD QR codes can insert" ON ussd_qr_codes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Worker stats viewable" ON worker_stats;
CREATE POLICY "Worker stats viewable" ON worker_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Worker stats can insert" ON worker_stats;
CREATE POLICY "Worker stats can insert" ON worker_stats FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tips_worker_id ON tips(worker_id);
CREATE INDEX IF NOT EXISTS idx_tips_mpesa_receipt ON tips(mpesa_receipt);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- ============================================================================
-- 9. CREATE ANALYTICS VIEW USING TIPS TABLE
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
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Check worker statistics accuracy
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
    WHERE mpesa_receipt IS NOT NULL
    AND status = 'completed'
    GROUP BY worker_id
) t ON w.worker_id = t.worker_id
ORDER BY w.total_tips DESC;

-- Show recent completed tips
SELECT 
    t.worker_id,
    w.name as worker_name,
    t.amount,
    t.mpesa_receipt,
    t.status,
    t.created_at
FROM tips t
LEFT JOIN workers w ON t.worker_id = w.worker_id
WHERE t.mpesa_receipt IS NOT NULL
AND t.status = 'completed'
ORDER BY t.created_at DESC
LIMIT 10;

SELECT 'DATABASE FIX COMPLETED - CASCADING DELETES ENABLED' as status;FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transaction logs can insert" ON transaction_logs;
CREATE POLICY "Transaction logs can insert" ON transaction_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "USSD mappings viewable" ON ussd_mappings;
CREATE POLICY "USSD mappings viewable" ON ussd_mappings FOR SELECT USING (true);

DROP POLICY IF EXISTS "USSD mappings can insert" ON ussd_mappings;
CREATE POLICY "USSD mappings can insert" ON ussd_mappings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "USSD QR codes viewable" ON ussd_qr_codes;
CREATE POLICY "USSD QR codes viewable" ON ussd_qr_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "USSD QR codes can insert" ON ussd_qr_codes;
CREATE POLICY "USSD QR codes can insert" ON ussd_qr_codes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Worker stats viewable" ON worker_stats;
CREATE POLICY "Worker stats viewable" ON worker_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Worker stats can insert" ON worker_stats;
CREATE POLICY "Worker stats can insert" ON worker_stats FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 8. CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tips_worker_id ON tips(worker_id);
CREATE INDEX IF NOT EXISTS idx_tips_mpesa_receipt ON tips(mpesa_receipt);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- ============================================================================
-- 9. CREATE ANALYTICS VIEW USING TIPS TABLE
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
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Check worker statistics accuracy
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
    WHERE mpesa_receipt IS NOT NULL
    AND status = 'completed'
    GROUP BY worker_id
) t ON w.worker_id = t.worker_id
ORDER BY w.total_tips DESC;

-- Show recent completed tips
SELECT 
    t.worker_id,
    w.name as worker_name,
    t.amount,
    t.mpesa_receipt,
    t.status,
    t.created_at
FROM tips t
LEFT JOIN workers w ON t.worker_id = w.worker_id
WHERE t.mpesa_receipt IS NOT NULL
AND t.status = 'completed'
ORDER BY t.created_at DESC
LIMIT 10;

SELECT 'DATABASE FIX COMPLETED - CASCADING DELETES ENABLED' as status;