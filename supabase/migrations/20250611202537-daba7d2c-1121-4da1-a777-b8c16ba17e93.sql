
-- Add columns to track original profit values and fix deal classification
ALTER TABLE public.deals 
ADD COLUMN original_gross_profit numeric,
ADD COLUMN original_fi_profit numeric,
ADD COLUMN original_total_profit numeric,
ADD COLUMN first_reported_date date;

-- Update the deal_type constraint to be more explicit about the three main categories
ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_deal_type_check;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_deal_type_check 
CHECK (deal_type IN ('retail', 'dealer_trade', 'wholesale'));

-- Create index for better performance on profit change queries
CREATE INDEX IF NOT EXISTS idx_deals_stock_date ON public.deals(stock_number, upload_date);
CREATE INDEX IF NOT EXISTS idx_deals_profit_changes ON public.deals(stock_number) WHERE original_gross_profit IS NOT NULL;
