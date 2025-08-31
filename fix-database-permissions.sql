-- Fix database permissions and view access
-- Run this in Supabase SQL Editor

-- Drop and recreate worker_stats view with proper permissions
DROP VIEW IF EXISTS worker_stats;

CREATE VIEW worker_stats AS
SELECT 
    w.worker_id,
    w.name,
    w.occupation,
    w.bio,
    w.profile_image_url,
    w.phone,
    w.total_tips,
    w.tip_count,
    w.subscription_plan,
    w.subscription_expiry,
    w.created_at,
    CASE 
        WHEN w.subscription_expiry > NOW() THEN 'active'
        WHEN w.created_at > NOW() - INTERVAL '7 days' THEN 'trial'
        ELSE 'expired'
    END as subscription_status,
    COALESCE(w.total_tips / NULLIF(w.tip_count, 0), 0) as average_tip
FROM workers w;

-- Grant proper access
GRANT SELECT ON worker_stats TO authenticated;
GRANT SELECT ON worker_stats TO anon;

-- Enable RLS on worker_stats view
ALTER VIEW worker_stats OWNER TO postgres;

-- Create policy for worker_stats view
CREATE POLICY "Public access to worker_stats" ON worker_stats FOR SELECT USING (true);