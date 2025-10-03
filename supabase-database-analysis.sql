-- COMPREHENSIVE SUPABASE DATABASE ANALYSIS
-- Run this in Supabase SQL Editor to get complete database overview

-- ============================================================================
-- 1. DATABASE STRUCTURE ANALYSIS
-- ============================================================================

SELECT '=== ALL TABLES ===' as section;
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '=== TABLE COLUMNS ===' as section;
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- 2. RELATIONSHIPS AND CONSTRAINTS
-- ============================================================================

SELECT '=== FOREIGN KEYS ===' as section;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';

SELECT '=== PRIMARY KEYS ===' as section;
SELECT
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public';

-- ============================================================================
-- 3. RLS POLICIES ANALYSIS
-- ============================================================================

SELECT '=== RLS POLICIES ===' as section;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT '=== RLS STATUS ===' as section;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 4. DATA ANALYSIS - RECORD COUNTS
-- ============================================================================

SELECT '=== TABLE RECORD COUNTS ===' as section;

-- Dynamic query to count all tables
DO $$
DECLARE
    table_record RECORD;
    query_text TEXT;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        query_text := 'SELECT ''' || table_record.tablename || ''' as table_name, COUNT(*) as record_count FROM ' || table_record.tablename;
        EXECUTE query_text;
    END LOOP;
END $$;

-- ============================================================================
-- 5. WORKERS TABLE ANALYSIS
-- ============================================================================

SELECT '=== WORKERS TABLE DATA ===' as section;
SELECT 
    worker_id,
    name,
    phone,
    total_tips,
    tip_count,
    created_at,
    updated_at
FROM workers
ORDER BY created_at DESC;

-- ============================================================================
-- 6. TRANSACTIONS/TIPS ANALYSIS
-- ============================================================================

SELECT '=== TRANSACTIONS ANALYSIS ===' as section;
-- Check if transactions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
) as transactions_table_exists;

-- If transactions table exists, analyze it
SELECT 
    worker_id,
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM transactions
GROUP BY worker_id, status
ORDER BY worker_id, status;

SELECT '=== TIPS ANALYSIS ===' as section;
-- Check if tips table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tips'
) as tips_table_exists;

-- If tips table exists, analyze it
SELECT 
    worker_id,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM tips
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tips')
GROUP BY worker_id
ORDER BY worker_id;

-- ============================================================================
-- 7. DATA INTEGRITY ISSUES
-- ============================================================================

SELECT '=== DATA INTEGRITY ISSUES ===' as section;

-- Check for orphaned records
SELECT 'Transactions without workers' as issue_type, COUNT(*) as count
FROM transactions t
LEFT JOIN workers w ON t.worker_id = w.worker_id
WHERE w.worker_id IS NULL;

-- Check for inconsistent totals
SELECT 'Workers with incorrect totals' as issue_type, COUNT(*) as count
FROM workers w
LEFT JOIN (
    SELECT 
        worker_id,
        COUNT(*) as actual_tip_count,
        SUM(amount) as actual_total_tips
    FROM transactions
    WHERE mpesa_tx_id IS NOT NULL
    GROUP BY worker_id
) t ON w.worker_id = t.worker_id
WHERE w.total_tips != COALESCE(t.actual_total_tips, 0)
   OR w.tip_count != COALESCE(t.actual_tip_count, 0);

-- ============================================================================
-- 8. RECENT ACTIVITY ANALYSIS
-- ============================================================================

SELECT '=== RECENT ACTIVITY (7 DAYS) ===' as section;
SELECT 
    'transactions' as table_name,
    COUNT(*) as recent_records
FROM transactions
WHERE created_at >= NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
    'workers' as table_name,
    COUNT(*) as recent_records
FROM workers
WHERE created_at >= NOW() - INTERVAL '7 days';

-- ============================================================================
-- 9. MPESA TRANSACTION ANALYSIS
-- ============================================================================

SELECT '=== MPESA TRANSACTION STATUS ===' as section;
SELECT 
    CASE 
        WHEN mpesa_tx_id IS NOT NULL THEN 'Completed'
        ELSE 'Pending/Failed'
    END as mpesa_status,
    status as db_status,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM transactions
GROUP BY 
    CASE WHEN mpesa_tx_id IS NOT NULL THEN 'Completed' ELSE 'Pending/Failed' END,
    status
ORDER BY mpesa_status, db_status;

-- ============================================================================
-- 10. INDEXES AND PERFORMANCE
-- ============================================================================

SELECT '=== INDEXES ===' as section;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- 11. FUNCTIONS AND TRIGGERS
-- ============================================================================

SELECT '=== FUNCTIONS ===' as section;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

SELECT '=== TRIGGERS ===' as section;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 12. SAMPLE DATA FROM KEY TABLES
-- ============================================================================

SELECT '=== SAMPLE TRANSACTIONS ===' as section;
SELECT 
    id,
    worker_id,
    amount,
    status,
    mpesa_tx_id,
    customer_number,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== SAMPLE WORKERS ===' as section;
SELECT 
    worker_id,
    name,
    phone,
    total_tips,
    tip_count,
    created_at
FROM workers
ORDER BY created_at DESC
LIMIT 10;