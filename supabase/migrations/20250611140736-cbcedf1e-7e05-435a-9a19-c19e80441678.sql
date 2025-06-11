
-- Add enum for source report types
CREATE TYPE public.source_report_type AS ENUM ('new_car_main_view', 'merch_inv_view', 'orders_all');

-- Add new columns to inventory table for enhanced tracking
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS source_report source_report_type;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS invoice numeric;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS rebates numeric;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS pack numeric;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS rpo_codes text[];
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS rpo_descriptions text[];
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS full_option_blob jsonb;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS first_seen_at timestamp with time zone;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS leads_count integer DEFAULT 0;

-- Update existing records to have proper timestamps
UPDATE public.inventory 
SET first_seen_at = created_at, last_seen_at = updated_at 
WHERE first_seen_at IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_vin ON public.inventory(vin);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_number ON public.inventory(stock_number);
CREATE INDEX IF NOT EXISTS idx_inventory_source_report ON public.inventory(source_report);
CREATE INDEX IF NOT EXISTS idx_inventory_rpo_codes ON public.inventory USING GIN(rpo_codes);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory(status);

-- Function to calculate leads count for a vehicle
CREATE OR REPLACE FUNCTION public.calculate_leads_count(p_vin text, p_stock_number text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  lead_count integer;
BEGIN
  SELECT COUNT(*) INTO lead_count
  FROM public.leads
  WHERE vehicle_vin = p_vin 
     OR (p_stock_number IS NOT NULL AND vehicle_interest ILIKE '%' || p_stock_number || '%');
  
  RETURN COALESCE(lead_count, 0);
END;
$$;

-- Function to update leads count for all inventory
CREATE OR REPLACE FUNCTION public.update_inventory_leads_count()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventory 
  SET leads_count = public.calculate_leads_count(vin, stock_number);
END;
$$;

-- Function to mark vehicles as sold when missing from new uploads
CREATE OR REPLACE FUNCTION public.mark_missing_vehicles_sold(p_upload_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark vehicles as sold if they weren't in the latest upload and are currently in_stock
  UPDATE public.inventory 
  SET 
    status = 'sold',
    sold_at = now(),
    updated_at = now()
  WHERE status = 'available' 
    AND upload_history_id != p_upload_id
    AND id NOT IN (
      SELECT DISTINCT i.id 
      FROM public.inventory i 
      WHERE i.upload_history_id = p_upload_id
    );
END;
$$;

-- Function to get RPO analytics
CREATE OR REPLACE FUNCTION public.get_rpo_analytics()
RETURNS TABLE(
  rpo_code text,
  total_vehicles integer,
  sold_vehicles integer,
  avg_days_to_sell numeric,
  total_sales_value numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unnest(i.rpo_codes) as rpo_code,
    COUNT(*)::integer as total_vehicles,
    COUNT(CASE WHEN i.status = 'sold' THEN 1 END)::integer as sold_vehicles,
    AVG(CASE WHEN i.status = 'sold' THEN i.days_in_inventory END) as avg_days_to_sell,
    SUM(CASE WHEN i.status = 'sold' THEN i.price END) as total_sales_value
  FROM public.inventory i
  WHERE i.rpo_codes IS NOT NULL AND array_length(i.rpo_codes, 1) > 0
  GROUP BY unnest(i.rpo_codes)
  ORDER BY sold_vehicles DESC, avg_days_to_sell ASC;
END;
$$;
