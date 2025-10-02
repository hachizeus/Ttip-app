-- TTip Phase 1 Database Schema - Final Version

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
ALTER TABLE reviews DROP COLUMN IF EXISTS tx_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_worker_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_commission ON transactions(commission_amount);

-- Insert test data with all required fields
INSERT INTO workers (worker_id, phone, name, occupation, gender, qr_code, referral_credits, total_referrals, average_rating, review_count) 
VALUES 
    ('W001TEST', '254712345678', 'John Doe', 'Waiter', 'Male', 'QR001TEST', 2, 3, 4.5, 10),
    ('W002TEST', '254712345679', 'Jane Smith', 'Bartender', 'Female', 'QR002TEST', 0, 0, 0.0, 0)
ON CONFLICT (worker_id) DO UPDATE SET
    referral_credits = EXCLUDED.referral_credits,
    total_referrals = EXCLUDED.total_referrals,
    average_rating = EXCLUDED.average_rating,
    review_count = EXCLUDED.review_count;

-- Create a test transaction
INSERT INTO transactions (worker_id, customer_number, amount, status, commission_amount, worker_payout, used_referral_credit)
VALUES ('W001TEST', '254700000999', 100, 'COMPLETED', 3, 97, false)
ON CONFLICT DO NOTHING;

-- Create a test review
INSERT INTO reviews (worker_id, rating, comment)
VALUES ('W001TEST', 5, 'Excellent service!')
ON CONFLICT DO NOTHING;