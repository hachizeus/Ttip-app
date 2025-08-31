-- Fix subscription_payments table with correct column names (matches existing schema)
CREATE TABLE IF NOT EXISTS subscription_payments (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    plan VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    mpesa_receipt VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own payments" ON subscription_payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON subscription_payments;
DROP POLICY IF EXISTS "Allow public access to subscription_payments" ON subscription_payments;

-- Create RLS policies for subscription_payments (using phone column)
CREATE POLICY "Users can view own payments" ON subscription_payments
    FOR SELECT USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can insert own payments" ON subscription_payments
    FOR INSERT WITH CHECK (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Allow public access to subscription_payments" ON subscription_payments
    FOR ALL USING (true);

-- Fix notifications table structure to match code expectations
-- Drop and recreate table with correct schema
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create correct policies for notifications (using user_id)
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Allow inserting notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Allow public access to notifications for now
CREATE POLICY "Allow public access to notifications" ON notifications
    FOR ALL USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_transaction_id ON subscription_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_phone ON subscription_payments(phone);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);