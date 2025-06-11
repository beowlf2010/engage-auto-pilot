
-- Update deal_type to support three categories instead of just new/used
ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_deal_type_check;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_deal_type_check 
CHECK (deal_type IN ('new', 'used', 'retail', 'dealer_trade', 'wholesale'));

-- Add pack_adjustment column to profit_snapshots for tracking pack adjustments
ALTER TABLE public.profit_snapshots 
ADD COLUMN retail_units integer DEFAULT 0,
ADD COLUMN retail_gross numeric DEFAULT 0,
ADD COLUMN dealer_trade_units integer DEFAULT 0,
ADD COLUMN dealer_trade_gross numeric DEFAULT 0,
ADD COLUMN wholesale_units integer DEFAULT 0,
ADD COLUMN wholesale_gross numeric DEFAULT 0,
ADD COLUMN pack_adjustment_used numeric DEFAULT 0;

-- Update existing deals to use 'retail' as default instead of 'new'/'used'
UPDATE public.deals 
SET deal_type = 'retail' 
WHERE deal_type IN ('new', 'used') OR deal_type IS NULL;

-- Create updated function for deal classification based on stock number
CREATE OR REPLACE FUNCTION public.classify_deal_by_stock(stock_number text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF stock_number IS NULL OR length(trim(stock_number)) = 0 THEN
    RETURN 'used';
  END IF;
  
  -- Check first character of stock number
  IF upper(left(trim(stock_number), 1)) = 'C' THEN
    RETURN 'new';
  ELSIF upper(left(trim(stock_number), 1)) IN ('B', 'X') THEN
    RETURN 'used';
  ELSE
    -- Default to used for unknown patterns
    RETURN 'used';
  END IF;
END;
$$;

-- Create function to update profit snapshots with three categories
CREATE OR REPLACE FUNCTION public.upsert_expanded_profit_snapshot(
  p_date date,
  p_retail_units integer,
  p_retail_gross numeric,
  p_dealer_trade_units integer,
  p_dealer_trade_gross numeric,
  p_wholesale_units integer,
  p_wholesale_gross numeric,
  p_new_units integer,
  p_new_gross numeric,
  p_used_units integer,
  p_used_gross numeric,
  p_total_units integer,
  p_total_sales numeric,
  p_total_gross numeric,
  p_total_fi_profit numeric,
  p_total_profit numeric,
  p_upload_history_id uuid,
  p_pack_adjustment_used numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_id UUID;
BEGIN
  INSERT INTO public.profit_snapshots (
    snapshot_date, retail_units, retail_gross, dealer_trade_units, dealer_trade_gross,
    wholesale_units, wholesale_gross, new_units, new_gross, used_units, used_gross,
    total_units, total_sales, total_gross, total_fi_profit, total_profit,
    upload_history_id, pack_adjustment_used
  )
  VALUES (
    p_date, p_retail_units, p_retail_gross, p_dealer_trade_units, p_dealer_trade_gross,
    p_wholesale_units, p_wholesale_gross, p_new_units, p_new_gross, p_used_units, p_used_gross,
    p_total_units, p_total_sales, p_total_gross, p_total_fi_profit, p_total_profit,
    p_upload_history_id, p_pack_adjustment_used
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    retail_units = EXCLUDED.retail_units,
    retail_gross = EXCLUDED.retail_gross,
    dealer_trade_units = EXCLUDED.dealer_trade_units,
    dealer_trade_gross = EXCLUDED.dealer_trade_gross,
    wholesale_units = EXCLUDED.wholesale_units,
    wholesale_gross = EXCLUDED.wholesale_gross,
    new_units = EXCLUDED.new_units,
    new_gross = EXCLUDED.new_gross,
    used_units = EXCLUDED.used_units,
    used_gross = EXCLUDED.used_gross,
    total_units = EXCLUDED.total_units,
    total_sales = EXCLUDED.total_sales,
    total_gross = EXCLUDED.total_gross,
    total_fi_profit = EXCLUDED.total_fi_profit,
    total_profit = EXCLUDED.total_profit,
    upload_history_id = EXCLUDED.upload_history_id,
    pack_adjustment_used = EXCLUDED.pack_adjustment_used,
    updated_at = now()
  RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$;
