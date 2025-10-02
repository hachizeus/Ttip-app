-- Check what gender values are allowed
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'workers'::regclass 
    AND conname LIKE '%gender%';