-- Add FCM token column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for FCM token lookups
CREATE INDEX IF NOT EXISTS idx_workers_fcm_token ON workers(fcm_token);

-- Update notifications table to include badge count
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS badge_count INTEGER DEFAULT 1;