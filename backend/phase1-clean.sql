-- TTip Phase 1 Database Schema - Clean Version

-- Update workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Update transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_amount INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS worker_payout INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS used_referral_credit BOOLEAN DEFAULT FALSE;

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_phone TEXT NOT NULL,
    referee_phone TEXT NOT NULL,
    referrer_worker_id TEXT NOT NULL,
    referee_worker_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'completed'
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_transactions_commission ON transactions(commission_amount);

-- Insert test data
INSERT INTO workers (worker_id, phone, name, occupation, gender, referral_credits, total_referrals) 
VALUES 
    ('W001TEST', '254712345678', 'John Doe', 'Waiter', 'male', 2, 3),
    ('W002TEST', '254712345679', 'Jane Smith', 'Bartender', 'female', 0, 0)
ON CONFLICT (worker_id) DO NOTHING;