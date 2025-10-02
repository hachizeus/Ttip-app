-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for public access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');