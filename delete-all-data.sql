-- DELETE ALL DATA FROM ALL TABLES
-- WARNING: This will permanently delete ALL data in your database

-- ============================================================================
-- 1. DISABLE FOREIGN KEY CONSTRAINTS TEMPORARILY
-- ============================================================================

DO $$
DECLARE
    table_name text;
BEGIN
    -- Get all tables and truncate them
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
        RAISE NOTICE 'Deleted all data from table: %', table_name;
    END LOOP;
END $$;

SELECT 'ALL DATA DELETED FROM ALL TABLES - FRESH START READY' as status;