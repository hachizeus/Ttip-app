-- Fix remaining unrestricted tables

-- Enable RLS on remaining tables
ALTER TABLE analytics_dashboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics_dashboard
CREATE POLICY "Allow analytics dashboard access" ON analytics_dashboard
    FOR ALL USING (true);

-- Create policies for worker_stats
CREATE POLICY "Allow worker stats access" ON worker_stats
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON analytics_dashboard TO service_role;
GRANT ALL ON worker_stats TO service_role;

COMMIT;