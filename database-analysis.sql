-- COMPREHENSIVE DATABASE ANALYSIS FOR TTIP
-- Run this first to understand the complete database structure

-- ============================================================================
-- 1. ALL TABLES AND VIEWS
-- ============================================================================

SELECT 
    'TABLES AND VIEWS' as section,
    schemaname,
    tablename as object_name,
    'TABLE' as object_type,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'TABLES AND VIEWS' as section,
    schemaname,
    viewname as object_name,
    'VIEW' as object_type,
    viewowner as tableowner,
    false as hasindexes,
    false as hasrules,
    false as hastriggers,
    false as rls_enabled
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY object_type, object_name;

-- ============================================================================
-- 2. ALL COLUMNS FOR EACH TABLE/VIEW
-- ============================================================================

SELECT 
    'COLUMNS' as section,
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
-- 3. ALL FOREIGN KEY RELATIONSHIPS
-- ============================================================================

SELECT
    'FOREIGN KEYS' as section,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- 4. ALL PRIMARY KEYS
-- ============================================================================

SELECT
    'PRIMARY KEYS' as section,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- 5. ALL EXISTING TRIGGERS
-- ============================================================================

SELECT 
    'TRIGGERS' as section,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 6. ALL EXISTING FUNCTIONS
-- ============================================================================

SELECT 
    'FUNCTIONS' as section,
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- 7. ALL RLS POLICIES
-- ============================================================================

SELECT 
    'RLS POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. ALL INDEXES
-- ============================================================================

SELECT 
    'INDEXES' as section,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- 9. EXISTING VIEWS DEFINITION
-- ============================================================================

SELECT 
    'VIEW DEFINITIONS' as section,
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- 10. DATA SAMPLE FROM KEY TABLES
-- ============================================================================

-- Workers sample
SELECT 'WORKERS SAMPLE' as section, worker_id, name, phone, total_tips, tip_count, created_at
FROM workers ORDER BY created_at DESC LIMIT 5;

-- Tips sample  
SELECT 'TIPS SAMPLE' as section, id, worker_id, amount, status, mpesa_receipt, created_at
FROM tips ORDER BY created_at DESC LIMIT 5;

-- Transactions sample
SELECT 'TRANSACTIONS SAMPLE' as section, id, worker_id, amount, status, mpesa_tx_id, created_at
FROM transactions ORDER BY created_at DESC LIMIT 5;

-- ============================================================================
-- 11. RECORD COUNTS
-- ============================================================================

SELECT 'RECORD COUNTS' as section, 'workers' as table_name, COUNT(*) as record_count FROM workers
UNION ALL
SELECT 'RECORD COUNTS' as section, 'tips' as table_name, COUNT(*) as record_count FROM tips
UNION ALL
SELECT 'RECORD COUNTS' as section, 'transactions' as table_name, COUNT(*) as record_count FROM transactions
UNION ALL
SELECT 'RECORD COUNTS' as section, 'reviews' as table_name, COUNT(*) as record_count FROM reviews
UNION ALL
SELECT 'RECORD COUNTS' as section, 'qr_codes' as table_name, COUNT(*) as record_count FROM qr_codes;

-- ============================================================================
-- 12. ORPHANED DATA CHECK
-- ============================================================================

SELECT 'ORPHANED DATA' as section, 'tips_without_workers' as issue, COUNT(*) as count
FROM tips WHERE worker_id NOT IN (SELECT worker_id FROM workers)
UNION ALL
SELECT 'ORPHANED DATA' as section, 'transactions_without_workers' as issue, COUNT(*) as count
FROM transactions WHERE worker_id NOT IN (SELECT worker_id FROM workers)
UNION ALL
SELECT 'ORPHANED DATA' as section, 'reviews_without_workers' as issue, COUNT(*) as count
FROM reviews WHERE worker_id NOT IN (SELECT worker_id FROM workers)
UNION ALL
SELECT 'ORPHANED DATA' as section, 'qr_codes_without_workers' as issue, COUNT(*) as count
FROM qr_codes WHERE worker_id NOT IN (SELECT worker_id FROM workers);

SELECT 'DATABASE ANALYSIS COMPLETED' as status;