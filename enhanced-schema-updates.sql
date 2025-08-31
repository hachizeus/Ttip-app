-- Enhanced TTip Database Schema Updates
-- Run these commands in Supabase SQL Editor

-- 1. Create profile images storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for profile images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own images" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Add new columns to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- 4. Create user_profiles table for extended user information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE REFERENCES workers(phone) ON DELETE CASCADE,
    bio TEXT,
    profile_image_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_workers_bio ON workers(bio);
CREATE INDEX IF NOT EXISTS idx_workers_profile_image ON workers(profile_image_url);

-- 6. Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Allow public access to user_profiles" ON user_profiles
    FOR ALL USING (true);

-- 8. Create function to automatically create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (phone, bio, profile_image_url)
    VALUES (NEW.phone, NEW.bio, NEW.profile_image_url)
    ON CONFLICT (phone) DO UPDATE SET
        bio = EXCLUDED.bio,
        profile_image_url = EXCLUDED.profile_image_url,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to sync worker data with user_profiles
CREATE TRIGGER sync_user_profile
    AFTER INSERT OR UPDATE ON workers
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- 10. Create function to update worker updated_at timestamp
CREATE OR REPLACE FUNCTION update_worker_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger for worker updated_at
CREATE TRIGGER update_worker_timestamp_trigger
    BEFORE UPDATE ON workers
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_timestamp();

-- 12. Create app_settings table for global app configuration
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Insert default app settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('max_tip_amount', '10000', 'Maximum tip amount allowed'),
('min_tip_amount', '10', 'Minimum tip amount allowed'),
('app_version', '"1.0.0"', 'Current app version'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- 14. Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 15. Create policy for app_settings (read-only for all users)
CREATE POLICY "Public read access to app_settings" ON app_settings
    FOR SELECT USING (true);

-- 16. Create notifications_settings table for user notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    tip_notifications BOOLEAN DEFAULT true,
    milestone_notifications BOOLEAN DEFAULT true,
    marketing_notifications BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 17. Enable RLS on notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- 18. Create policies for notification_settings
CREATE POLICY "Users can manage own notification settings" ON notification_settings
    FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'phone');

-- 19. Create indexes for notification_settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- 20. Create analytics table for tracking user interactions
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at DESC);

-- 22. Enable RLS on user_analytics
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- 23. Create policy for user_analytics
CREATE POLICY "Users can insert own analytics" ON user_analytics
    FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Allow public access to user_analytics" ON user_analytics
    FOR ALL USING (true);

-- 24. Create view for worker statistics
CREATE OR REPLACE VIEW worker_stats AS
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

-- 25. Grant access to the view
GRANT SELECT ON worker_stats TO authenticated, anon;

-- 26. Create function to get worker profile with stats
CREATE OR REPLACE FUNCTION get_worker_profile(worker_phone TEXT)
RETURNS TABLE (
    worker_id VARCHAR(20),
    name VARCHAR(255),
    occupation VARCHAR(255),
    bio TEXT,
    profile_image_url TEXT,
    phone VARCHAR(20),
    total_tips DECIMAL(10,2),
    tip_count INTEGER,
    subscription_plan VARCHAR(10),
    subscription_status TEXT,
    average_tip DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.worker_id,
        ws.name,
        ws.occupation,
        ws.bio,
        ws.profile_image_url,
        ws.phone,
        ws.total_tips,
        ws.tip_count,
        ws.subscription_plan,
        ws.subscription_status,
        ws.average_tip
    FROM worker_stats ws
    WHERE ws.phone = worker_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 27. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_worker_profile(TEXT) TO authenticated, anon;

-- Completion message
SELECT 'Enhanced TTip database schema updates completed successfully!' as status;