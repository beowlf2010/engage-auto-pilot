
-- Drop the existing conflicting view first
DROP VIEW IF EXISTS public.v_monthly_retail_summary;

-- Update the status check constraint to include GM Global numeric status codes
ALTER TABLE public.inventory 
DROP CONSTRAINT IF EXISTS inventory_status_check;

-- Add new constraint that includes both text and numeric statuses
ALTER TABLE public.inventory 
ADD CONSTRAINT inventory_status_check 
CHECK (status IN ('available', 'sold', 'pending', 'reserved', 'sold_pending', 'wholesale', 'auction', 
                  '2000', '2100', '2200', '2300', '2400', '2500', '2600', '2700', '2800', '2900',
                  '3000', '3100', '3200', '3300', '3400', '3500', '3600', '3700', '3800', '3900',
                  '4000', '4100', '4200', '4300', '4400', '4500', '4600', '4700', '4800', '4900',
                  '5000', '5100', '5200', '5300', '5400', '5500', '5600', '5700', '5800', '5900',
                  '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900'));

-- Now we can safely update GM Global orders that were incorrectly marked as 'sold'
UPDATE public.inventory 
SET status = '6000'  -- CTP status
WHERE source_report = 'orders_all' 
  AND status = 'sold';

-- Create the monthly retail summary view with correct structure
CREATE VIEW public.v_monthly_retail_summary AS
WITH current_month_deals AS (
  SELECT 
    deal_type,
    stock_number,
    CASE 
      WHEN deal_type = 'retail' THEN 'retail'
      WHEN deal_type = 'dealer_trade' THEN 'dealer_trade' 
      WHEN deal_type = 'wholesale' THEN 'wholesale'
      ELSE 'retail'  -- default fallback
    END as normalized_deal_type,
    gross_profit,
    fi_profit,
    total_profit,
    sale_amount
  FROM public.deals 
  WHERE EXTRACT(YEAR FROM upload_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM upload_date) = EXTRACT(MONTH FROM CURRENT_DATE)
),
deal_type_classification AS (
  SELECT 
    *,
    CASE 
      WHEN stock_number IS NOT NULL AND 
           LEFT(UPPER(TRIM(stock_number)), 1) = 'C' THEN 'new'
      ELSE 'used'
    END as vehicle_type
  FROM current_month_deals
)
SELECT 
  -- New vehicle metrics
  COUNT(*) FILTER (WHERE vehicle_type = 'new') as new_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE vehicle_type = 'new'), 0) as new_gross_mtd,
  
  -- Used vehicle metrics  
  COUNT(*) FILTER (WHERE vehicle_type = 'used') as used_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE vehicle_type = 'used'), 0) as used_gross_mtd,
  
  -- Total metrics
  COUNT(*) as total_units_mtd,
  COALESCE(SUM(total_profit), 0) as total_profit_mtd,
  
  -- Deal type breakdown
  COUNT(*) FILTER (WHERE normalized_deal_type = 'retail') as retail_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'retail'), 0) as retail_gross_mtd,
  
  COUNT(*) FILTER (WHERE normalized_deal_type = 'dealer_trade') as dealer_trade_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'dealer_trade'), 0) as dealer_trade_gross_mtd,
  
  COUNT(*) FILTER (WHERE normalized_deal_type = 'wholesale') as wholesale_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'wholesale'), 0) as wholesale_gross_mtd
FROM deal_type_classification;

-- Update days_in_inventory calculation to be more accurate
CREATE OR REPLACE FUNCTION public.update_inventory_days()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update days in inventory for available vehicles
  UPDATE public.inventory 
  SET days_in_inventory = EXTRACT(DAY FROM (now() - COALESCE(first_seen_at, created_at)))::INTEGER
  WHERE status = 'available';
  
  -- Update days in inventory for GM Global orders
  UPDATE public.inventory 
  SET days_in_inventory = EXTRACT(DAY FROM (now() - COALESCE(order_date, first_seen_at, created_at)))::INTEGER
  WHERE source_report = 'orders_all' AND status != 'sold';
END;
$function$;

-- Run the days calculation update
SELECT public.update_inventory_days();

-- Create index for better performance on inventory stats queries
CREATE INDEX IF NOT EXISTS idx_inventory_active_status ON public.inventory(status, source_report) 
WHERE status != 'sold';

CREATE INDEX IF NOT EXISTS idx_inventory_days_aging ON public.inventory(days_in_inventory) 
WHERE status = 'available';
