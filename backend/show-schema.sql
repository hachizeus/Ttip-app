-- Show current database schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('workers', 'transactions', 'referrals', 'reviews')
ORDER BY table_name, ordinal_position;