
-- Add unique constraint on stock_number and upload_date to support upsert operations
-- This prevents duplicate deals for the same stock number on the same date
ALTER TABLE public.deals 
ADD CONSTRAINT deals_stock_upload_date_unique 
UNIQUE (stock_number, upload_date);

-- Create an index to improve performance on this constraint
CREATE INDEX IF NOT EXISTS idx_deals_stock_upload_date 
ON public.deals(stock_number, upload_date);
