
-- First, let's identify and fix the corrupted GM Global records that are marked as "sold"
-- GM Global orders should never have status 'sold' - they should only have pipeline statuses

-- Step 1: Update corrupted GM Global records back to their proper status
-- We'll set them to 'available' which is the closest equivalent for orders in the pipeline
UPDATE public.inventory 
SET 
  status = 'available',
  sold_at = NULL,
  updated_at = now()
WHERE source_report = 'orders_all' 
  AND status = 'sold'
  AND gm_order_number IS NOT NULL;

-- Step 2: Add a check constraint to prevent GM Global orders from being marked as sold in the future
-- Note: Using a trigger instead of CHECK constraint to avoid immutability issues
CREATE OR REPLACE FUNCTION validate_gm_global_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent GM Global orders from being marked as sold
  IF NEW.source_report = 'orders_all' AND NEW.status = 'sold' THEN
    RAISE EXCEPTION 'GM Global orders (source_report: orders_all) cannot be marked as sold. Status attempted: %', NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_gm_global_status_trigger ON public.inventory;
CREATE TRIGGER validate_gm_global_status_trigger
  BEFORE INSERT OR UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION validate_gm_global_status();

-- Step 3: Create an index to improve performance when querying GM Global orders
CREATE INDEX IF NOT EXISTS idx_inventory_gm_global_orders 
ON public.inventory (source_report, gm_order_number) 
WHERE source_report = 'orders_all' AND gm_order_number IS NOT NULL;

-- Step 4: Update the vehicle status service function to handle GM Global status correctly
CREATE OR REPLACE FUNCTION public.get_gm_global_status_summary()
RETURNS TABLE(
  status_code text,
  status_count bigint,
  status_description text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.status as status_code,
    COUNT(*) as status_count,
    CASE 
      WHEN i.status = '2000' THEN 'Placed/Waiting'
      WHEN i.status = '3000' THEN 'In Production/Transit'
      WHEN i.status = '5000' THEN 'Near Delivery'
      WHEN i.status = '6000' THEN 'Customer Take Possession (CTP)'
      ELSE i.gm_status_description
    END as status_description
  FROM public.inventory i
  WHERE i.source_report = 'orders_all'
    AND i.gm_order_number IS NOT NULL
    AND i.status != 'sold'  -- Exclude any remaining corrupted records
  GROUP BY i.status, i.gm_status_description
  ORDER BY i.status;
END;
$$;
