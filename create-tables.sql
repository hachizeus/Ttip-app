-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER,
    title VARCHAR(255),
    body TEXT,
    badge_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add FCM token column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for FCM token lookups
CREATE INDEX IF NOT EXISTS idx_workers_fcm_token ON workers(fcm_token);