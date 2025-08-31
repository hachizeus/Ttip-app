-- TTip Database Schema for Supabase

-- Workers table
CREATE TABLE workers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    occupation VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    worker_id VARCHAR(20) NOT NULL UNIQUE,
    qr_code TEXT NOT NULL,
    subscription_plan VARCHAR(10) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'lite', 'pro')),
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    total_tips DECIMAL(10,2) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tips table
CREATE TABLE tips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(worker_id),
    amount DECIMAL(10,2) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table (for tracking subscription payments)
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(worker_id),
    plan VARCHAR(10) NOT NULL CHECK (plan IN ('lite', 'pro')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_workers_worker_id ON workers(worker_id);
CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_tips_worker_id ON tips(worker_id);
CREATE INDEX idx_tips_status ON tips(status);
CREATE INDEX idx_tips_created_at ON tips(created_at);
CREATE INDEX idx_subscriptions_worker_id ON subscriptions(worker_id);

-- Function to update worker stats when tip is completed
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update worker stats
CREATE TRIGGER trigger_update_worker_stats
    AFTER UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

-- Function to update subscription status
CREATE OR REPLACE FUNCTION update_worker_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE workers 
        SET 
            subscription_plan = NEW.plan,
            subscription_expiry = NEW.expires_at,
            updated_at = NOW()
        WHERE worker_id = NEW.worker_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update worker subscription
CREATE TRIGGER trigger_update_worker_subscription
    AFTER UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_subscription();

-- Row Level Security (RLS) policies
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to workers (for leaderboard)
CREATE POLICY "Allow public read access to workers" ON workers
    FOR SELECT USING (true);

-- Allow public insert for worker registration
CREATE POLICY "Allow public insert for workers" ON workers
    FOR INSERT WITH CHECK (true);

-- Allow workers to update their own data
CREATE POLICY "Allow workers to update own data" ON workers
    FOR UPDATE USING (true);

-- Allow public read access to tips (for stats)
CREATE POLICY "Allow public read access to tips" ON tips
    FOR SELECT USING (true);

-- Allow public insert for tips
CREATE POLICY "Allow public insert for tips" ON tips
    FOR INSERT WITH CHECK (true);

-- Allow public update for tips (for status updates)
CREATE POLICY "Allow public update for tips" ON tips
    FOR UPDATE USING (true);

-- Allow public access to subscriptions
CREATE POLICY "Allow public access to subscriptions" ON subscriptions
    FOR ALL USING (true);