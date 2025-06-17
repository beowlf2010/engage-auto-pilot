
-- Add comprehensive GM Global columns to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS estimated_delivery_date date,
ADD COLUMN IF NOT EXISTS actual_delivery_date date,
ADD COLUMN IF NOT EXISTS order_date date,
ADD COLUMN IF NOT EXISTS gm_order_number text,
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS dealer_order_code text,
ADD COLUMN IF NOT EXISTS build_week text,
ADD COLUMN IF NOT EXISTS production_sequence text,
ADD COLUMN IF NOT EXISTS gm_status_description text,
ADD COLUMN IF NOT EXISTS delivery_method text,
ADD COLUMN IF NOT EXISTS priority_code text,
ADD COLUMN IF NOT EXISTS order_type text,
ADD COLUMN IF NOT EXISTS plant_code text,
ADD COLUMN IF NOT EXISTS ship_to_dealer_code text,
ADD COLUMN IF NOT EXISTS selling_dealer_code text,
ADD COLUMN IF NOT EXISTS order_priority text,
ADD COLUMN IF NOT EXISTS special_equipment text,
ADD COLUMN IF NOT EXISTS customer_order_number text,
ADD COLUMN IF NOT EXISTS trade_hold_status text,
ADD COLUMN IF NOT EXISTS allocation_code text,
ADD COLUMN IF NOT EXISTS gm_model_code text,
ADD COLUMN IF NOT EXISTS order_source text,
ADD COLUMN IF NOT EXISTS original_order_date date,
ADD COLUMN IF NOT EXISTS revised_delivery_date date,
ADD COLUMN IF NOT EXISTS delivery_variance_days integer;

-- Create indexes for better query performance on new date columns
CREATE INDEX IF NOT EXISTS idx_inventory_estimated_delivery_date ON public.inventory(estimated_delivery_date);
CREATE INDEX IF NOT EXISTS idx_inventory_order_date ON public.inventory(order_date);
CREATE INDEX IF NOT EXISTS idx_inventory_gm_order_number ON public.inventory(gm_order_number);
CREATE INDEX IF NOT EXISTS idx_inventory_customer_name ON public.inventory(customer_name);
CREATE INDEX IF NOT EXISTS idx_inventory_build_week ON public.inventory(build_week);

-- Add function to calculate delivery variance
CREATE OR REPLACE FUNCTION public.calculate_delivery_variance()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventory 
  SET delivery_variance_days = CASE 
    WHEN actual_delivery_date IS NOT NULL AND estimated_delivery_date IS NOT NULL 
    THEN EXTRACT(DAY FROM (actual_delivery_date - estimated_delivery_date))::integer
    ELSE NULL 
  END
  WHERE estimated_delivery_date IS NOT NULL;
END;
$$;

-- Add function to get GM Global orders by delivery timeline
CREATE OR REPLACE FUNCTION public.get_gm_orders_by_delivery_timeline(
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT CURRENT_DATE + interval '30 days'
)
RETURNS TABLE(
  id uuid,
  gm_order_number text,
  customer_name text,
  estimated_delivery_date date,
  actual_delivery_date date,
  make text,
  model text,
  year integer,
  status text,
  gm_status_description text,
  delivery_variance_days integer,
  is_overdue boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.gm_order_number,
    i.customer_name,
    i.estimated_delivery_date,
    i.actual_delivery_date,
    i.make,
    i.model,
    i.year,
    i.status,
    i.gm_status_description,
    i.delivery_variance_days,
    (i.estimated_delivery_date < CURRENT_DATE AND i.actual_delivery_date IS NULL) as is_overdue
  FROM public.inventory i
  WHERE i.condition = 'new'
    AND i.estimated_delivery_date BETWEEN p_start_date AND p_end_date
    AND i.gm_order_number IS NOT NULL
  ORDER BY i.estimated_delivery_date ASC, i.gm_order_number ASC;
END;
$$;
