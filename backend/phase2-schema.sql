-- TTip Phase 2 Database Schema
-- Analytics, Insights, Recurring Tips, Notifications, Marketing

-- Customer insights table
CREATE TABLE IF NOT EXISTS customer_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR NOT NULL,
    worker_id VARCHAR NOT NULL,
    tip_frequency INTEGER DEFAULT 0,
    average_tip_amount NUMERIC DEFAULT 0,
    preferred_hours JSONB DEFAULT '{}',
    last_tip_date TIMESTAMP,
    total_tips_given NUMERIC DEFAULT 0,
    customer_segment VARCHAR DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id VARCHAR NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    qr_scans INTEGER DEFAULT 0,
    payment_attempts INTEGER DEFAULT 0,
    successful_payments INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_earnings NUMERIC DEFAULT 0,
    average_tip NUMERIC DEFAULT 0,
    peak_hour INTEGER DEFAULT 12,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

-- Recurring tips table
CREATE TABLE IF NOT EXISTS recurring_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR NOT NULL,
    worker_id VARCHAR NOT NULL,
    amount NUMERIC NOT NULL,
    frequency VARCHAR NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly')),
    next_payment_date DATE NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    total_payments INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Push notifications table
CREATE TABLE IF NOT EXISTS push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id VARCHAR,
    customer_phone VARCHAR,
    title VARCHAR NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR NOT NULL,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    engagement_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name VARCHAR NOT NULL,
    campaign_type VARCHAR NOT NULL CHECK (campaign_type IN ('discount', 'bonus', 'referral', 'seasonal')),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    bonus_amount NUMERIC DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_segment VARCHAR DEFAULT 'all',
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    usage_count INTEGER DEFAULT 0,
    total_savings NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer feedback table
CREATE TABLE IF NOT EXISTS customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID,
    worker_id VARCHAR NOT NULL,
    customer_phone VARCHAR,
    feedback_type VARCHAR NOT NULL CHECK (feedback_type IN ('service', 'app', 'suggestion', 'complaint')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    message TEXT,
    status VARCHAR DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tax reporting table
CREATE TABLE IF NOT EXISTS tax_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id VARCHAR NOT NULL,
    report_period VARCHAR NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    total_earnings NUMERIC NOT NULL,
    total_tips NUMERIC NOT NULL,
    commission_paid NUMERIC NOT NULL,
    tax_category VARCHAR DEFAULT 'service_income',
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(worker_id, year, month)
);

-- Earnings forecast table
CREATE TABLE IF NOT EXISTS earnings_forecast (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id VARCHAR NOT NULL,
    forecast_date DATE NOT NULL,
    predicted_earnings NUMERIC NOT NULL,
    confidence_level DECIMAL(5,2) NOT NULL,
    factors JSONB DEFAULT '{}',
    actual_earnings NUMERIC,
    accuracy_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(worker_id, forecast_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_insights_worker ON customer_insights(worker_id);
CREATE INDEX IF NOT EXISTS idx_customer_insights_phone ON customer_insights(customer_phone);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_worker_date ON performance_metrics(worker_id, date);
CREATE INDEX IF NOT EXISTS idx_recurring_tips_worker ON recurring_tips(worker_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tips_next_payment ON recurring_tips(next_payment_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_push_notifications_scheduled ON push_notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_active ON marketing_campaigns(start_date, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_customer_feedback_worker ON customer_feedback(worker_id);
CREATE INDEX IF NOT EXISTS idx_tax_reports_worker_period ON tax_reports(worker_id, year, month);
CREATE INDEX IF NOT EXISTS idx_earnings_forecast_worker_date ON earnings_forecast(worker_id, forecast_date);

-- Create views for analytics
CREATE OR REPLACE VIEW analytics_dashboard AS
SELECT 
    w.worker_id,
    w.name,
    w.occupation,
    w.total_tips,
    w.tip_count,
    w.average_rating,
    pm.conversion_rate,
    pm.peak_hour,
    pm.total_earnings as daily_earnings,
    COUNT(ci.id) as regular_customers,
    COUNT(rt.id) as recurring_subscribers,
    AVG(cf.rating) as feedback_rating
FROM workers w
LEFT JOIN performance_metrics pm ON w.worker_id = pm.worker_id AND pm.date = CURRENT_DATE
LEFT JOIN customer_insights ci ON w.worker_id = ci.worker_id
LEFT JOIN recurring_tips rt ON w.worker_id = rt.worker_id AND rt.status = 'active'
LEFT JOIN customer_feedback cf ON w.worker_id = cf.worker_id
GROUP BY w.worker_id, w.name, w.occupation, w.total_tips, w.tip_count, w.average_rating, 
         pm.conversion_rate, pm.peak_hour, pm.total_earnings;

-- Function to update customer insights
CREATE OR REPLACE FUNCTION update_customer_insights()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
        INSERT INTO customer_insights (customer_phone, worker_id, tip_frequency, average_tip_amount, last_tip_date, total_tips_given)
        VALUES (NEW.customer_number, NEW.worker_id, 1, NEW.worker_payout, NOW(), NEW.worker_payout)
        ON CONFLICT (customer_phone, worker_id) DO UPDATE SET
            tip_frequency = customer_insights.tip_frequency + 1,
            average_tip_amount = (customer_insights.average_tip_amount * customer_insights.tip_frequency + NEW.worker_payout) / (customer_insights.tip_frequency + 1),
            last_tip_date = NOW(),
            total_tips_given = customer_insights.total_tips_given + NEW.worker_payout,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customer insights
DROP TRIGGER IF EXISTS trigger_update_customer_insights ON transactions;
CREATE TRIGGER trigger_update_customer_insights
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_insights();

-- Function to update performance metrics
CREATE OR REPLACE FUNCTION update_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' THEN
        INSERT INTO performance_metrics (worker_id, date, successful_payments, total_earnings, average_tip)
        VALUES (NEW.worker_id, CURRENT_DATE, 1, NEW.worker_payout, NEW.worker_payout)
        ON CONFLICT (worker_id, date) DO UPDATE SET
            successful_payments = performance_metrics.successful_payments + 1,
            total_earnings = performance_metrics.total_earnings + NEW.worker_payout,
            average_tip = performance_metrics.total_earnings / performance_metrics.successful_payments,
            conversion_rate = CASE 
                WHEN performance_metrics.payment_attempts > 0 
                THEN (performance_metrics.successful_payments::DECIMAL / performance_metrics.payment_attempts * 100)
                ELSE 0 
            END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for performance metrics
DROP TRIGGER IF EXISTS trigger_update_performance_metrics ON transactions;
CREATE TRIGGER trigger_update_performance_metrics
    AFTER UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics();

-- Insert sample data for testing
INSERT INTO marketing_campaigns (campaign_name, campaign_type, discount_percentage, start_date, end_date, status)
VALUES 
    ('New Year Bonus', 'bonus', 0, '2025-01-01', '2025-01-31', 'active'),
    ('Valentine Special', 'discount', 10, '2025-02-10', '2025-02-20', 'draft');

INSERT INTO customer_feedback (worker_id, feedback_type, rating, message, status)
VALUES 
    ('W001TEST', 'service', 5, 'Excellent service, very professional!', 'new'),
    ('W001TEST', 'app', 4, 'App is great but could use more payment options', 'new');

COMMIT;