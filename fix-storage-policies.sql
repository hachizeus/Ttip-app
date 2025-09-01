-- Fix storage policies for profile-images bucket
-- Run this in Supabase SQL Editor

-- Allow anyone to upload to profile-images bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-images');

-- Allow anyone to read from profile-images bucket  
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-images');

-- Allow anyone to update files in profile-images bucket
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'profile-images');

-- Allow anyone to delete files in profile-images bucket
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'profile-images');