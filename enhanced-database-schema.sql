-- Enhanced TTIP Database Schema
-- Comprehensive schema for digital tipping platform

-- Users table (customers, workers, managers, admin)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    name VARCHAR(255),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'worker', 'manager', 'admin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    pin_hash VARCHAR(255), -- Encrypted PIN for security
    biometric_enabled BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workers table (extended from current)
CREATE TABLE workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    occupation VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    worker_id VARCHAR(20) NOT NULL UNIQUE,
    qr_code TEXT NOT NULL,
    profile_image_url TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),
    subscription_plan VARCHAR(10) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'lite', 'pro')),
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    total_tips DECIMAL(12,2) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verification_documents JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teams table
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    manager_id UUID REFERENCES users(id),
    location VARCHAR(255),
    team_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team members
CREATE TABLE team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'lead', 'manager')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, worker_id)
);

-- Enhanced tips table
CREATE TABLE tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(worker_id),
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    transaction_id VARCHAR(255),
    mpesa_receipt VARCHAR(255),
    payment_method VARCHAR(20) DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'card', 'paypal', 'stripe')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    tip_type VARCHAR(20) DEFAULT 'individual' CHECK (tip_type IN ('individual', 'team_split')),
    message TEXT, -- Optional message from customer
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ratings and reviews
CREATE TABLE ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tip_id UUID REFERENCES tips(id),
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    customer_phone VARCHAR(20),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty points system
CREATE TABLE loyalty_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('earned', 'redeemed', 'expired')),
    description TEXT,
    reference_id UUID, -- Can reference tips, rewards, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rewards catalog
CREATE TABLE rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    category VARCHAR(50),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reward redemptions
CREATE TABLE reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    reward_id UUID REFERENCES rewards(id),
    points_used INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'cancelled')),
    delivery_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription payments
CREATE TABLE subscription_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    phone VARCHAR(20) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    transaction_id VARCHAR(255),
    mpesa_receipt VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    billing_period VARCHAR(20) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL, -- Can be phone number or user ID
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    data JSONB, -- Additional data for the notification
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback and disputes
CREATE TABLE feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(20),
    user_type VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID REFERENCES users(id),
    resolution TEXT,
    attachments JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tip_id UUID REFERENCES tips(id),
    reporter_phone VARCHAR(20) NOT NULL,
    dispute_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB, -- Photos, screenshots, etc.
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    total_tips DECIMAL(12,2) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    unique_customers INTEGER DEFAULT 0,
    average_tip DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, worker_id)
);

-- Payment methods and wallets
CREATE TABLE payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('mpesa', 'bank', 'card', 'paypal')),
    details JSONB NOT NULL, -- Store encrypted payment details
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet transactions (for B2C payouts)
CREATE TABLE wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) REFERENCES workers(worker_id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('payout', 'refund', 'fee', 'bonus')),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    reference_id VARCHAR(255), -- M-Pesa conversation ID
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_workers_worker_id ON workers(worker_id);
CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_workers_location ON workers(location_lat, location_lng);
CREATE INDEX idx_tips_worker_id ON tips(worker_id);
CREATE INDEX idx_tips_status ON tips(status);
CREATE INDEX idx_tips_created_at ON tips(created_at);
CREATE INDEX idx_tips_amount ON tips(amount);
CREATE INDEX idx_ratings_worker_id ON ratings(worker_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_daily_stats_date ON daily_stats(date);
CREATE INDEX idx_daily_stats_worker_date ON daily_stats(worker_id, date);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_worker_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE workers 
        SET 
            total_tips = total_tips + NEW.amount,
            tip_count = tip_count + 1,
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id;
        
        -- Update daily stats
        INSERT INTO daily_stats (date, worker_id, total_tips, tip_count, unique_customers, average_tip)
        VALUES (
            CURRENT_DATE, 
            NEW.worker_id, 
            NEW.amount, 
            1, 
            1,
            NEW.amount
        )
        ON CONFLICT (date, worker_id) 
        DO UPDATE SET
            total_tips = daily_stats.total_tips + NEW.amount,
            tip_count = daily_stats.tip_count + 1,
            average_tip = (daily_stats.total_tips + NEW.amount) / (daily_stats.tip_count + 1);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_stats
    AFTER UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

-- Function to update ratings
CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE workers 
    SET 
        average_rating = (
            SELECT AVG(rating)::DECIMAL(3,2) 
            FROM ratings 
            WHERE worker_id = NEW.worker_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM ratings 
            WHERE worker_id = NEW.worker_id
        ),
        updated_at = NOW()
    WHERE worker_id = NEW.worker_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_worker_rating
    AFTER INSERT ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_rating();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own data" ON users
    FOR ALL USING (phone = current_setting('app.current_user_phone', true));

CREATE POLICY "Public read access to workers" ON workers
    FOR SELECT USING (true);

CREATE POLICY "Workers can update own data" ON workers
    FOR UPDATE USING (phone = current_setting('app.current_user_phone', true));

CREATE POLICY "Public access to tips for stats" ON tips
    FOR SELECT USING (true);

CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = current_setting('app.current_user_phone', true));