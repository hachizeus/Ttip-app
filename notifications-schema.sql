-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'phone');

-- Create policy to allow inserting notifications
CREATE POLICY "Allow inserting notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Create policy to allow updating own notifications
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'phone');