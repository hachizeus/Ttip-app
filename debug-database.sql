-- Debug Database Structure and Data for Analytics Issue
-- Run this in Supabase SQL Editor

-- 1. Check worker data
SELECT 'WORKER DATA' as section;
SELECT worker_id, name, phone, total_tips, tip_count, created_at 
FROM workers 
WHERE worker_id = 'WCMNAYISA' OR phone LIKE '%759001048%';

-- 2. Check all tables that might contain tip data
SELECT 'TIPS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tips' 
ORDER BY ordinal_position;

SELECT 'TRANSACTIONS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;

-- 3. Check tips table data
SELECT 'TIPS TABLE DATA' as section;
SELECT * FROM tips 
WHERE worker_id = 'WCMNAYISA' 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. Check transactions table data
SELECT 'TRANSACTIONS TABLE DATA' as section;
SELECT * FROM transactions 
WHERE worker_id = 'WCMNAYISA' 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Check for any other tables with tip data
SELECT 'ALL TABLES WITH TIP/TRANSACTION DATA' as section;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%tip%' OR table_name LIKE '%transaction%' OR table_name LIKE '%payment%');

-- 6. Count records by status
SELECT 'TRANSACTION STATUS COUNTS' as section;
SELECT status, COUNT(*) as count 
FROM transactions 
WHERE worker_id = 'WCMNAYISA' 
GROUP BY status;

-- 7. Check recent transactions (last 30 days)
SELECT 'RECENT TRANSACTIONS (30 DAYS)' as section;
SELECT id, worker_id, amount, status, created_at, customer_number
FROM transactions 
WHERE worker_id = 'WCMNAYISA' 
AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 8. Check date formats and ranges
SELECT 'DATE ANALYSIS' as section;
SELECT 
  MIN(created_at) as earliest_transaction,
  MAX(created_at) as latest_transaction,
  COUNT(*) as total_transactions
FROM transactions 
WHERE worker_id = 'WCMNAYISA';

-- 9. Check if there are any pending tips in AsyncStorage equivalent
SELECT 'PENDING TIPS CHECK' as section;
SELECT * FROM transactions 
WHERE worker_id = 'WCMNAYISA' 
AND status IN ('PENDING', 'pending', 'queued')
ORDER BY created_at DESC;