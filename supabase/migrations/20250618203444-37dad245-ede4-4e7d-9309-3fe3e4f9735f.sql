
-- Add missing columns to upload_history table for website scraping support
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'file_upload';
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processing';

-- Update the source_type to be more descriptive for existing records
UPDATE public.upload_history 
SET source_type = CASE 
  WHEN upload_type = 'inventory' THEN 'file_upload'
  WHEN upload_type = 'leads' THEN 'file_upload'
  WHEN upload_type = 'financial' THEN 'file_upload'
  ELSE 'file_upload'
END
WHERE source_type = 'file_upload';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_upload_history_source_type ON public.upload_history(source_type);
CREATE INDEX IF NOT EXISTS idx_upload_history_processing_status ON public.upload_history(processing_status);

-- Add constraint to ensure valid source_type values
ALTER TABLE public.upload_history 
ADD CONSTRAINT check_source_type 
CHECK (source_type IN ('file_upload', 'website_scrape', 'api_import'));

-- Add constraint to ensure valid processing_status values  
ALTER TABLE public.upload_history 
ADD CONSTRAINT check_processing_status 
CHECK (processing_status IN ('processing', 'completed', 'failed'));
