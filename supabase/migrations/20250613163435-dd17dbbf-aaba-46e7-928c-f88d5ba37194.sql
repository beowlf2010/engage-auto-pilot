
-- First, let's clean up duplicates by keeping only the most recent version of each stock number
-- This query will delete older duplicate records, keeping only the latest upload_date and created_at for each stock_number
DELETE FROM public.deals 
WHERE id NOT IN (
  SELECT DISTINCT ON (stock_number) id 
  FROM public.deals 
  ORDER BY stock_number, upload_date DESC, created_at DESC
);

-- Now add the unique constraint on stock_number
ALTER TABLE public.deals ADD CONSTRAINT deals_stock_number_unique UNIQUE (stock_number);

-- Create an index to improve performance on stock_number lookups
CREATE INDEX IF NOT EXISTS idx_deals_stock_number ON public.deals(stock_number);
