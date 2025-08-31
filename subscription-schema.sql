-- Create subscription_payments table
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_transaction_id ON subscription_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_phone ON subscription_payments(phone);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);