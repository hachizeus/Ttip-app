-- QUICK DATABASE FIX FOR TTIP
-- Run this in Supabase SQL Editor to fix immediate issues

-- ============================================================================
-- 1. FIX WORKER STATISTICS (IMMEDIATE FIX)
-- ============================================================================

-- Recalculate all worker statistics based on completed transactions
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

-- Reset workers with no completed transactions to zero
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
-- 2. CREATE TRIGGER TO AUTO-UPDATE WORKER STATS
-- ============================================================================

-- Create function to update worker statistics
CREATE OR REPLACE FUNCTION update_worker_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update worker statistics when transaction gets mpesa_tx_id (completed)
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_worker_stats ON transactions;

-- Create trigger
CREATE TRIGGER trigger_update_worker_stats
    AFTER INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

-- ============================================================================
-- 3. ADD USEFUL INDEXES
-- ============================================================================

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_worker_mpesa ON transactions(worker_id, mpesa_tx_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Check current worker statistics
SELECT 
    w.worker_id,
    w.name,
    w.total_tips as db_total,
    w.tip_count as db_count,
    COALESCE(t.actual_total, 0) as calculated_total,
    COALESCE(t.actual_count, 0) as calculated_count,
    CASE 
        WHEN w.total_tips = COALESCE(t.actual_total, 0) AND w.tip_count = COALESCE(t.actual_count, 0) 
        THEN '✅ CORRECT' 
        ELSE '❌ MISMATCH' 
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

-- Show recent completed transactions
SELECT 
    t.id,
    t.worker_id,
    w.name as worker_name,
    t.amount,
    t.mpesa_tx_id,
    t.created_at,
    t.status
FROM transactions t
LEFT JOIN workers w ON t.worker_id = w.worker_id
WHERE t.mpesa_tx_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 10;