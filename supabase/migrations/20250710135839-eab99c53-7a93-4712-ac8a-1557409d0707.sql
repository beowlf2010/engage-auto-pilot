-- Add original_stock_number column to deals table to track original stock numbers even when they can't be linked to inventory
ALTER TABLE public.deals 
ADD COLUMN original_stock_number TEXT;

-- Add index for better performance when querying by original stock number
CREATE INDEX IF NOT EXISTS idx_deals_original_stock_number 
ON public.deals (original_stock_number) 
WHERE original_stock_number IS NOT NULL;

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN public.deals.original_stock_number IS 'Stores the original stock number from financial reports even when it cannot be linked to inventory due to missing records';