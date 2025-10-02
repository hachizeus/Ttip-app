-- TTip Phase 1 Database Schema - No Test Data

-- Update workers table (add missing columns)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Update transactions table (add commission tracking)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commission_amount NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS worker_payout NUMERIC DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS used_referral_credit BOOLEAN DEFAULT FALSE;

-- Create referrals table (if not exists)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_phone VARCHAR NOT NULL,
    referee_phone VARCHAR NOT NULL,
    referrer_worker_id VARCHAR NOT NULL,
    referee_worker_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'completed'
);

-- Update existing reviews table to match our needs
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS transaction_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_worker_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_commission ON transactions(commission_amount);