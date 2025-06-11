
-- Create upload_history table to track all file uploads
CREATE TABLE public.upload_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL, -- 'csv', 'xlsx', 'xls'
  upload_type TEXT NOT NULL, -- 'inventory', 'leads'
  inventory_condition TEXT, -- for inventory uploads: 'new', 'used', 'certified'
  total_rows INTEGER NOT NULL DEFAULT 0,
  successful_imports INTEGER NOT NULL DEFAULT 0,
  failed_imports INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'completed', -- 'processing', 'completed', 'failed'
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create storage bucket for uploaded files
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', false);

-- Create RLS policies for upload_history
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own upload history" 
  ON public.upload_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own upload records" 
  ON public.upload_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload records" 
  ON public.upload_history 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload records" 
  ON public.upload_history 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create storage policies for upload files
CREATE POLICY "Users can upload files" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view their own uploaded files" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploaded files" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Expand inventory table with comprehensive fields for Vauto/GM Global data
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS invoice_cost DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS wholesale_cost DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS reconditioning_cost DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS dealer_pack DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS holdback DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS incentives DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS book_value DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS trade_value DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lot_location TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS sales_rep TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS window_sticker_url TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS photos_urls TEXT[];
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS certification_type TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS warranty_type TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS warranty_months INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS warranty_miles INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS vehicle_history_report TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS accidents_reported INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS previous_owners INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS service_records_available BOOLEAN DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS factory_warranty_remaining BOOLEAN DEFAULT false;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS key_count INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS title_status TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lien_holder TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS acquisition_date DATE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS expected_sale_date DATE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS turn_goal_days INTEGER;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS age_group TEXT; -- '0-30', '31-60', '61-90', '90+'
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS internet_price DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS finance_payment DECIMAL(8,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS lease_payment DECIMAL(8,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cash_down_payment DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS source_acquired TEXT; -- 'trade', 'auction', 'lease_return', 'dealer_trade'
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS upload_history_id UUID REFERENCES upload_history(id);

-- Add index for upload history queries
CREATE INDEX idx_upload_history_user_created ON public.upload_history(user_id, created_at DESC);
CREATE INDEX idx_upload_history_type ON public.upload_history(upload_type, inventory_condition);
CREATE INDEX idx_inventory_upload_history ON public.inventory(upload_history_id);
