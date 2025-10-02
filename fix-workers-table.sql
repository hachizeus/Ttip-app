-- Fix workers table to work with Phase 1 (TEXT worker_id)
-- Run this in Supabase SQL Editor

-- Check current workers table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workers' AND table_schema = 'public';

-- Add worker_id column if it doesn't exist (for Phase 1 compatibility)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS worker_id TEXT UNIQUE;

-- Update existing workers to have worker_id values
UPDATE workers SET worker_id = 'WORKER' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0') 
WHERE worker_id IS NULL;

-- Insert test workers for Phase 1
INSERT INTO workers (id, worker_id, name, phone, occupation) VALUES 
(gen_random_uuid(), 'WORKER001', 'John Doe', '+254712345678', 'Bartender'),
(gen_random_uuid(), 'WORKER002', 'Jane Smith', '+254723456789', 'Waiter')
ON CONFLICT (worker_id) DO NOTHING;