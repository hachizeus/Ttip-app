-- Check existing database structure
-- Run this in Supabase SQL Editor to see what already exists

-- Check existing tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check existing storage buckets
SELECT * FROM storage.buckets;

-- Check existing storage policies
SELECT policyname, tablename, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage';

-- Check existing RLS policies on public tables
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;