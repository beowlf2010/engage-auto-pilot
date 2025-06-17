
-- Fix storage bucket permissions for uploads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'uploads';

-- Create RLS policies for the uploads bucket to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
USING (bucket_id = 'uploads' AND auth.role() = 'authenticated');
