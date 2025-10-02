-- TTip Phase 1 - Minimal Setup (Your DB already has most tables!)
-- Only add missing test data and storage

-- Add test workers if they don't exist
INSERT INTO workers (id, worker_id, name, gender, phone, occupation, qr_code) VALUES 
(gen_random_uuid(), 'WORKER001', 'John Doe', 'Male', '+254712345678', 'Bartender', 'temp_qr_001'),
(gen_random_uuid(), 'WORKER002', 'Jane Smith', 'Female', '+254723456789', 'Waiter', 'temp_qr_002')
ON CONFLICT (worker_id) DO NOTHING;

-- Storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr_codes', 'qr_codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'TTip QR Access') THEN
        CREATE POLICY "TTip QR Access" ON storage.objects FOR SELECT USING (bucket_id = 'qr_codes');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'TTip QR Upload') THEN
        CREATE POLICY "TTip QR Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr_codes');
    END IF;
END
$$;