-- TTip Production Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workers table
CREATE TABLE workers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female')),
    occupation VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    worker_id VARCHAR(20) NOT NULL UNIQUE,
    qr_code TEXT NOT NULL,
    subscription_plan VARCHAR(10) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'lite', 'pro')),
    subscription_expiry TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    total_tips DECIMAL(10,2) DEFAULT 0,
    tip_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tips table
CREATE TABLE tips (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(255),
    mpesa_receipt VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL,
    plan VARCHAR(10) NOT NULL CHECK (plan IN ('lite', 'pro')),
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(255),
    mpesa_receipt VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_workers_worker_id ON workers(worker_id);
CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_workers_total_tips ON workers(total_tips DESC);
CREATE INDEX idx_tips_worker_id ON tips(worker_id);
CREATE INDEX idx_tips_status ON tips(status);
CREATE INDEX idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX idx_subscriptions_worker_id ON subscriptions(worker_id);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Update worker stats trigger
CREATE OR REPLACE FUNCTION update_worker_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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

CREATE TRIGGER trigger_update_worker_stats
    AFTER INSERT OR UPDATE ON tips
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_stats();

-- Update subscription trigger
CREATE OR REPLACE FUNCTION update_worker_subscription()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
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

CREATE TRIGGER trigger_update_worker_subscription
    AFTER INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_worker_subscription();

-- RLS Policies
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Public read workers" ON workers FOR SELECT USING (true);
CREATE POLICY "Public insert workers" ON workers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update workers" ON workers FOR UPDATE USING (true);

CREATE POLICY "Public read tips" ON tips FOR SELECT USING (true);
CREATE POLICY "Public insert tips" ON tips FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update tips" ON tips FOR UPDATE USING (true);

CREATE POLICY "Public access subscriptions" ON subscriptions FOR ALL USING (true);