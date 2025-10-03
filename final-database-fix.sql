-- FINAL DATABASE FIX FOR TTIP
-- Clean, working version without syntax errors

-- ============================================================================
-- 1. DROP DEPENDENT VIEWS FIRST
-- ============================================================================

DROP VIEW IF EXISTS worker_analytics CASCADE;

-- ============================================================================
-- 2. FIX DATA TYPE MISMATCHES
-- ============================================================================

ALTER TABLE transactions 
ALTER COLUMN worker_id TYPE character varying;

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_worker_id_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(worker_id);

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_worker_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.mpesa_tx_id IS NOT NULL AND NEW.worker_id IS NOT NULL THEN
        UPDATE workers 
        SET 
            total_tips = COALESCE((
                SELECT SUM(amount) 
                FROM transactions 
                WHERE worker_id = NEW.worker_id 
                AND mpesa_tx_id IS NOT NULL
            ), 0),
            tip_count = COALESCE((
                SELECT COUNT(*) 
                FROM transactions 
                WHERE worker_id = NEW.worker_id 
                AND mpesa_tx_id IS NOT NULL
            ), 0),
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_worker_stats ON transactions;

CREATE TRIGGER trigger_update_worker_stats
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

-- ============================================================================
-- 5. FIX CURRENT WORKER STATISTICS
-- ============================================================================

UPDATE workers 
SET 
    total_tips = COALESCE(stats.total_amount, 0),
    tip_count = COALESCE(stats.transaction_count, 0),
    updated_at = NOW()
FROM (
    SELECT 
        worker_id,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
    FROM transactions 
    WHERE mpesa_tx_id IS NOT NULL
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
    FROM transactions 
    WHERE mpesa_tx_id IS NOT NULL
    AND worker_id IS NOT NULL
);

-- ============================================================================
-- 6. ADD RLS POLICIES
-- ============================================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers are viewable by everyone" ON workers;
CREATE POLICY "Workers are viewable by everyone" ON workers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
CREATE POLICY "Anyone can insert workers" ON workers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert transactions" ON transactions;
CREATE POLICY "Anyone can insert transactions" ON transactions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update transactions" ON transactions;
CREATE POLICY "System can update transactions" ON transactions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert reviews" ON reviews;
CREATE POLICY "Anyone can insert reviews" ON reviews
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "QR codes are viewable by everyone" ON qr_codes;
CREATE POLICY "QR codes are viewable by everyone" ON qr_codes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert QR codes" ON qr_codes;
CREATE POLICY "Anyone can insert QR codes" ON qr_codes
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 7. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_worker_mpesa ON transactions(worker_id, mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);

-- ============================================================================
-- 8. RECREATE ANALYTICS VIEW
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
    COALESCE(recent.recent_count, 0) as transactions_last_7_days,
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
    FROM transactions 
    WHERE mpesa_tx_id IS NOT NULL 
    AND created_at >= NOW() - INTERVAL '7 days'
    GROUP BY worker_id
) recent ON w.worker_id = recent.worker_id;

-- ============================================================================
-- 9. VERIFICATION QUERIES
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
    FROM transactions 
    WHERE mpesa_tx_id IS NOT NULL
    GROUP BY worker_id
) t ON w.worker_id = t.worker_id
ORDER BY w.total_tips DESC;

SELECT 'DATABASE FIX COMPLETED SUCCESSFULLY' as status;