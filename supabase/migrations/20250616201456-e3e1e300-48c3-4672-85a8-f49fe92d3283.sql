
-- Add deal_type_locked column to track when a deal type has been manually locked
ALTER TABLE public.deals 
ADD COLUMN deal_type_locked boolean DEFAULT false;

-- Create index for better performance on locked deal queries
CREATE INDEX IF NOT EXISTS idx_deals_type_locked ON public.deals(deal_type_locked) WHERE deal_type_locked = true;

-- Update existing wholesale and dealer_trade deals to be locked
UPDATE public.deals 
SET deal_type_locked = true 
WHERE deal_type IN ('wholesale', 'dealer_trade');
