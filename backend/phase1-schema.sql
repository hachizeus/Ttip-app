-- TTip Phase 1 Database Schema
-- Commission-based Revenue, Referral System, Review System

-- Update workers table with new columns
ALTER TABLE workers ADD COLUMN IF NOT EXISTS referral_credits INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Update transactions table with commission tracking
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
    transaction_id TEXT NOT NULL REFERENCES transactions(id),
    worker_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create commission_stats table for tracking revenue
CREATE TABLE IF NOT EXISTS commission_stats (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    total_commission INTEGER DEFAULT 0,
    total_volume INTEGER DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_worker_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_transaction ON reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_commission ON transactions(commission_amount) WHERE commission_amount > 0;

-- Add foreign key constraints
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_referrer 
    FOREIGN KEY (referrer_phone) REFERENCES workers(phone);
ALTER TABLE referrals ADD CONSTRAINT fk_referrals_referee 
    FOREIGN KEY (referee_phone) REFERENCES workers(phone);

-- Create view for commission analytics
CREATE OR REPLACE VIEW commission_analytics AS
SELECT 
    DATE(t.created_at) as date,
    COUNT(*) as transaction_count,
    SUM(t.amount) as total_volume,
    SUM(t.commission_amount) as total_commission,
    SUM(t.worker_payout) as total_payouts,
    AVG(t.commission_amount::DECIMAL / t.amount * 100) as avg_commission_rate,
    COUNT(CASE WHEN t.used_referral_credit THEN 1 END) as referral_credit_used
FROM transactions t
WHERE t.status = 'COMPLETED' AND t.commission_amount IS NOT NULL
GROUP BY DATE(t.created_at)
ORDER BY date DESC;

-- Create view for referral analytics
CREATE OR REPLACE VIEW referral_analytics AS
SELECT 
    w.worker_id,
    w.name,
    w.referral_credits,
    w.total_referrals,
    COUNT(r.id) as active_referrals,
    SUM(CASE WHEN t.used_referral_credit THEN t.amount ELSE 0 END) as commission_saved
FROM workers w
LEFT JOIN referrals r ON w.worker_id = r.referrer_worker_id
LEFT JOIN transactions t ON w.phone = (
    SELECT phone FROM workers WHERE worker_id = t.worker_id
) AND t.used_referral_credit = TRUE
WHERE w.total_referrals > 0
GROUP BY w.worker_id, w.name, w.referral_credits, w.total_referrals
ORDER BY w.total_referrals DESC;

-- Create view for worker performance with reviews
CREATE OR REPLACE VIEW worker_performance AS
SELECT 
    w.worker_id,
    w.name,
    w.occupation,
    w.total_tips,
    w.tip_count,
    w.average_rating,
    w.review_count,
    w.total_referrals,
    w.referral_credits,
    COALESCE(SUM(t.commission_amount), 0) as total_commission_paid,
    COALESCE(SUM(t.worker_payout), 0) as total_received
FROM workers w
LEFT JOIN transactions t ON w.worker_id = t.worker_id AND t.status = 'COMPLETED'
GROUP BY w.worker_id, w.name, w.occupation, w.total_tips, w.tip_count, 
         w.average_rating, w.review_count, w.total_referrals, w.referral_credits
ORDER BY w.total_tips DESC;

-- Insert sample data for testing
INSERT INTO workers (worker_id, phone, name, occupation, referral_credits, total_referrals) 
VALUES 
    ('W001TEST', '254712345678', 'John Doe', 'Waiter', 2, 3),
    ('W002TEST', '254712345679', 'Jane Smith', 'Bartender', 0, 0),
    ('W003TEST', '254712345680', 'Mike Johnson', 'Valet', 1, 1)
ON CONFLICT (worker_id) DO NOTHING;

-- Insert sample referral
INSERT INTO referrals (referrer_phone, referee_phone, referrer_worker_id, referee_worker_id)
VALUES ('254712345678', '254712345679', 'W001TEST', 'W002TEST')
ON CONFLICT DO NOTHING;

-- Function to update daily commission stats
CREATE OR REPLACE FUNCTION update_commission_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND NEW.commission_amount IS NOT NULL THEN
        INSERT INTO commission_stats (date, total_commission, total_volume, transaction_count)
        VALUES (CURRENT_DATE, NEW.commission_amount, NEW.amount, 1)
        ON CONFLICT (date) DO UPDATE SET
            total_commission = commission_stats.total_commission + NEW.commission_amount,
            total_volume = commission_stats.total_volume + NEW.amount,
            transaction_count = commission_stats.transaction_count + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic commission stats updates
DROP TRIGGER IF EXISTS trigger_update_commission_stats ON transactions;
CREATE TRIGGER trigger_update_commission_stats
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_commission_stats();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMIT;