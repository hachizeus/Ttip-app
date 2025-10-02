-- Phase 3 Marketplace Database Schema
-- Run this to create marketplace, social, and gamification tables

-- Service Categories
CREATE TABLE IF NOT EXISTS service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#667eea',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Profiles (Enhanced)
CREATE TABLE IF NOT EXISTS worker_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id) UNIQUE,
    bio TEXT,
    skills TEXT[],
    hourly_rate DECIMAL(10,2),
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    profile_views INTEGER DEFAULT 0,
    social_links JSONB,
    availability JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Services
CREATE TABLE IF NOT EXISTS worker_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    category_id UUID REFERENCES service_categories(id),
    service_name TEXT NOT NULL,
    description TEXT,
    price_range TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Points System
CREATE TABLE IF NOT EXISTS loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    worker_id UUID REFERENCES workers(id),
    points_earned INTEGER DEFAULT 0,
    points_spent INTEGER DEFAULT 0,
    current_balance INTEGER DEFAULT 0,
    tier_level TEXT DEFAULT 'bronze',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Rewards
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT NOT NULL, -- 'discount', 'free_tip', 'merchandise'
    reward_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement Badges
CREATE TABLE IF NOT EXISTS achievement_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    badge_type TEXT NOT NULL, -- 'worker', 'customer'
    criteria JSONB NOT NULL,
    points_reward INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- worker_id or customer_phone
    user_type TEXT NOT NULL, -- 'worker' or 'customer'
    badge_id UUID REFERENCES achievement_badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    leaderboard_type TEXT NOT NULL, -- 'earnings', 'tips_count', 'rating', 'reviews'
    period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
    rank_position INTEGER NOT NULL,
    score DECIMAL(15,2) NOT NULL,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, leaderboard_type, period, period_start)
);

-- Social Interactions
CREATE TABLE IF NOT EXISTS social_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    worker_id UUID REFERENCES workers(id),
    interaction_type TEXT NOT NULL, -- 'like', 'share', 'bookmark'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Followers
CREATE TABLE IF NOT EXISTS worker_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    follower_phone TEXT NOT NULL,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, follower_phone)
);

-- Insert default service categories
INSERT INTO service_categories (name, description, icon, color) VALUES
('Food & Beverage', 'Restaurant, cafe, and food service workers', '🍽️', '#ff6b6b'),
('Transportation', 'Taxi, boda boda, and delivery drivers', '🚗', '#4ecdc4'),
('Beauty & Wellness', 'Salon, spa, and wellness service providers', '💄', '#45b7d1'),
('Retail & Shopping', 'Shop attendants and retail workers', '🛍️', '#96ceb4'),
('Hospitality', 'Hotel, lodge, and accommodation staff', '🏨', '#ffeaa7'),
('Security', 'Security guards and safety personnel', '🛡️', '#6c5ce7'),
('Cleaning', 'Cleaning and maintenance services', '🧹', '#a29bfe'),
('Entertainment', 'Event staff and entertainment workers', '🎭', '#fd79a8'),
('Healthcare', 'Healthcare support and service staff', '⚕️', '#00b894'),
('Education', 'Teaching and educational support staff', '📚', '#e17055'),
('Other Services', 'General service workers', '⚙️', '#636e72')
ON CONFLICT (name) DO NOTHING;

-- Insert default achievement badges
INSERT INTO achievement_badges (badge_name, description, icon, rarity, badge_type, criteria, points_reward) VALUES
('First Tip', 'Received your first tip', '🎉', 'common', 'worker', '{"tips_received": 1}', 10),
('Tip Collector', 'Received 10 tips', '💰', 'common', 'worker', '{"tips_received": 10}', 25),
('Tip Master', 'Received 100 tips', '👑', 'rare', 'worker', '{"tips_received": 100}', 100),
('Five Star', 'Achieved 5-star average rating', '⭐', 'epic', 'worker', '{"average_rating": 5.0, "review_count": 5}', 200),
('Popular Worker', 'Got 50 followers', '👥', 'rare', 'worker', '{"followers": 50}', 150),
('Generous Tipper', 'Given 10 tips', '🎁', 'common', 'customer', '{"tips_given": 10}', 20),
('Super Tipper', 'Given 50 tips', '💎', 'rare', 'customer', '{"tips_given": 50}', 100),
('Loyal Customer', 'Tipped same worker 10 times', '🤝', 'epic', 'customer', '{"loyalty_tips": 10}', 150)
ON CONFLICT (badge_name) DO NOTHING;

-- Insert default loyalty rewards
INSERT INTO loyalty_rewards (reward_name, description, points_required, reward_type, reward_value) VALUES
('5% Tip Discount', 'Get 5% off your next tip', 100, 'discount', 0.05),
('Free Small Tip', 'Send a free 50 KSh tip', 200, 'free_tip', 50.00),
('10% Tip Discount', 'Get 10% off your next tip', 300, 'discount', 0.10),
('Free Medium Tip', 'Send a free 100 KSh tip', 500, 'free_tip', 100.00),
('TTip Merchandise', 'Get exclusive TTip branded items', 1000, 'merchandise', 0.00),
('Free Large Tip', 'Send a free 200 KSh tip', 1500, 'free_tip', 200.00)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_profiles_worker_id ON worker_profiles(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_worker_id ON worker_services(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_category_id ON worker_services(category_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer_phone ON loyalty_points(customer_phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_worker_id ON loyalty_points(worker_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_period ON leaderboards(leaderboard_type, period);
CREATE INDEX IF NOT EXISTS idx_worker_followers_worker_id ON worker_followers(worker_id);
CREATE INDEX IF NOT EXISTS idx_social_interactions_worker_id ON social_interactions(worker_id);

-- Enable RLS on all tables
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Allow read access for all, restrict writes)
CREATE POLICY "Allow read access to service_categories" ON service_categories FOR SELECT USING (true);
CREATE POLICY "Allow read access to worker_profiles" ON worker_profiles FOR SELECT USING (true);
CREATE POLICY "Allow read access to worker_services" ON worker_services FOR SELECT USING (true);
CREATE POLICY "Allow read access to loyalty_rewards" ON loyalty_rewards FOR SELECT USING (true);
CREATE POLICY "Allow read access to achievement_badges" ON achievement_badges FOR SELECT USING (true);
CREATE POLICY "Allow read access to leaderboards" ON leaderboards FOR SELECT USING (true);

-- Allow authenticated users to manage their own data
CREATE POLICY "Users can manage their loyalty_points" ON loyalty_points FOR ALL USING (true);
CREATE POLICY "Users can manage their achievements" ON user_achievements FOR ALL USING (true);
CREATE POLICY "Users can manage social_interactions" ON social_interactions FOR ALL USING (true);
CREATE POLICY "Users can manage worker_followers" ON worker_followers FOR ALL USING (true);

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON worker_profiles, worker_services, loyalty_points, user_achievements, social_interactions, worker_followers TO anon, authenticated;

-- Comments
COMMENT ON TABLE service_categories IS 'Categories for different types of services workers provide';
COMMENT ON TABLE worker_profiles IS 'Enhanced profiles for workers with social features';
COMMENT ON TABLE worker_services IS 'Services offered by workers in different categories';
COMMENT ON TABLE loyalty_points IS 'Customer loyalty points system';
COMMENT ON TABLE loyalty_rewards IS 'Available rewards for loyalty points';
COMMENT ON TABLE achievement_badges IS 'Gamification badges for workers and customers';
COMMENT ON TABLE user_achievements IS 'Earned achievements by users';
COMMENT ON TABLE leaderboards IS 'Rankings and competitions between workers';
COMMENT ON TABLE social_interactions IS 'Social interactions like likes, shares, bookmarks';
COMMENT ON TABLE worker_followers IS 'Customers following workers for updates';