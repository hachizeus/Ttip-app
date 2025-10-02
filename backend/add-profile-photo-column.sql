-- Add profile_photo_url column to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;