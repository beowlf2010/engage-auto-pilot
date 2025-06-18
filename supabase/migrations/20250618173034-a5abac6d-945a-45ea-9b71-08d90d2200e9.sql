
-- First, let's add the missing columns to upload_history table
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'csv';
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS upload_started_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS upload_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS field_mapping JSONB DEFAULT '{}';
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS processing_errors JSONB DEFAULT '[]';
ALTER TABLE public.upload_history ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'processing';

-- Add columns to leads table for enhanced data preservation (only if they don't exist)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS raw_upload_data JSONB DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS original_status TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_mapping_log JSONB DEFAULT '{}';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS upload_history_id UUID;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS salesperson_first_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS salesperson_last_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS data_source_quality_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS original_row_index INTEGER;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_upload_history_id_fkey'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_upload_history_id_fkey 
        FOREIGN KEY (upload_history_id) REFERENCES public.upload_history(id);
    END IF;
END $$;

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_leads_upload_history_id ON public.leads(upload_history_id);
CREATE INDEX IF NOT EXISTS idx_leads_original_status ON public.leads(original_status);
CREATE INDEX IF NOT EXISTS idx_leads_raw_upload_data ON public.leads USING GIN(raw_upload_data);
CREATE INDEX IF NOT EXISTS idx_upload_history_uploaded_by ON public.upload_history(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_history_upload_status ON public.upload_history(upload_status);

-- Enable Row Level Security on upload_history if not already enabled
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for upload_history if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'upload_history' AND policyname = 'Allow all operations on upload_history'
    ) THEN
        CREATE POLICY "Allow all operations on upload_history" ON public.upload_history FOR ALL USING (true);
    END IF;
END $$;
