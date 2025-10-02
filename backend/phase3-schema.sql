-- Phase 3 Database Schema Extensions
-- Run this after Phase 2 schema is in place

-- Enhanced transactions table (add new columns)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS fraud_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Idempotency keys table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Admin users table (for 2FA)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    totp_secret TEXT,
    role TEXT DEFAULT 'admin',
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud detection tables
CREATE TABLE IF NOT EXISTS fraud_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID,
    customer_phone TEXT,
    customer_email TEXT,
    amount DECIMAL(10,2),
    payment_method TEXT,
    fraud_score DECIMAL(3,2),
    flagged BOOLEAN DEFAULT false,
    reasons TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL, -- phone or email
    reason TEXT,
    added_by UUID REFERENCES admin_users(id),
    removed_by UUID REFERENCES admin_users(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ
);

-- USSD and offline payment tables
CREATE TABLE IF NOT EXISTS ussd_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    qr_type TEXT NOT NULL, -- 'ussd', 'paybill', 'offline', 'standard'
    qr_url TEXT,
    qr_svg TEXT,
    qr_content TEXT,
    instructions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ussd_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mpesa_code TEXT UNIQUE NOT NULL,
    worker_id UUID REFERENCES workers(id),
    amount DECIMAL(10,2),
    phone_number TEXT,
    reconciled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitoring and logging tables
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    message TEXT,
    stack TEXT,
    context JSONB,
    severity TEXT DEFAULT 'info',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    message TEXT,
    context JSONB,
    ip_address INET,
    user_agent TEXT,
    severity TEXT DEFAULT 'warning',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT,
    severity TEXT DEFAULT 'warning',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES admin_users(id),
    acknowledged_at TIMESTAMPTZ,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    worker_id UUID,
    amount DECIMAL(10,2),
    gateway TEXT,
    status TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    data JSONB,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ml_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insights JSONB NOT NULL,
    data_points INTEGER,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_fraud_score ON transactions(fraud_score);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_flagged ON fraud_checks(flagged);
CREATE INDEX IF NOT EXISTS idx_fraud_checks_created_at ON fraud_checks(created_at);
CREATE INDEX IF NOT EXISTS idx_fraud_blacklist_identifier ON fraud_blacklist(identifier) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_system_logs_type_timestamp ON system_logs(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp ON analytics_events(type, timestamp);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- Row Level Security (RLS) policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "Admin users can manage admin_users" ON admin_users
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can view fraud_checks" ON fraud_checks
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can manage fraud_blacklist" ON fraud_blacklist
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can view system_logs" ON system_logs
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can view security_logs" ON security_logs
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can manage system_alerts" ON system_alerts
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Cleanup function for old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    -- Delete logs older than 30 days
    DELETE FROM system_logs WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Delete security logs older than 90 days
    DELETE FROM security_logs WHERE timestamp < NOW() - INTERVAL '90 days';
    
    -- Delete expired idempotency keys
    DELETE FROM idempotency_keys WHERE expires_at < NOW();
    
    -- Delete old analytics events (keep 60 days)
    DELETE FROM analytics_events WHERE timestamp < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT cleanup_old_logs();');

-- Create default admin user (change password immediately!)
INSERT INTO admin_users (username, password_hash, salt, role) 
VALUES (
    'admin',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', -- empty string hash
    'default_salt',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON transactions, fraud_checks, ussd_mappings TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE idempotency_keys IS 'Stores idempotency keys to prevent duplicate requests';
COMMENT ON TABLE admin_users IS 'Admin users with 2FA support';
COMMENT ON TABLE fraud_checks IS 'Fraud detection results for all transactions';
COMMENT ON TABLE fraud_blacklist IS 'Blacklisted phone numbers and emails';
COMMENT ON TABLE ussd_qr_codes IS 'USSD and offline QR codes for workers';
COMMENT ON TABLE ussd_mappings IS 'Maps M-Pesa codes to workers for reconciliation';
COMMENT ON TABLE system_logs IS 'Application logs and errors';
COMMENT ON TABLE security_logs IS 'Security events and violations';
COMMENT ON TABLE analytics_events IS 'User behavior and system events for analytics';
COMMENT ON TABLE ml_insights IS 'Machine learning generated insights';

-- Create a view for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_24h,
    (SELECT COUNT(*) FROM transactions WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '24 hours') as completed_24h,
    (SELECT COUNT(*) FROM fraud_checks WHERE flagged = true AND created_at >= NOW() - INTERVAL '24 hours') as fraud_flags_24h,
    (SELECT SUM(amount) FROM transactions WHERE status = 'COMPLETED' AND created_at >= NOW() - INTERVAL '24 hours') as revenue_24h,
    (SELECT COUNT(*) FROM system_alerts WHERE acknowledged = false) as unacknowledged_alerts;

COMMENT ON VIEW admin_dashboard_stats IS 'Quick stats for admin dashboard';