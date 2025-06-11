
-- First, let's see what the current check constraint allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.inventory'::regclass 
AND contype = 'c' 
AND conname = 'inventory_status_check';

-- Drop the existing check constraint
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_status_check;

-- Create a new check constraint that includes GM Global status codes
ALTER TABLE public.inventory ADD CONSTRAINT inventory_status_check 
CHECK (status IN ('available', 'sold', 'pending', 'reserved', '5000', '4200', '3000', '1000', '2000'));

-- Now run the update query again
UPDATE public.inventory 
SET status = CASE 
  -- Available on Lot (Dealer codes) -> 5000
  WHEN full_option_blob->>'Current Event' IN ('CHDCRW', 'CLDCRW', 'CHDDBL', 'CLDREG') THEN '5000'
  
  -- Ordered/In Transit (BAC) -> 4200  
  WHEN full_option_blob->>'Current Event' = '307156' THEN '4200'
  
  -- In Production -> 3000
  WHEN full_option_blob->>'Current Event' IN ('1', 'EQUINX', 'SUBURB', 'TAHOE') THEN '3000'
  
  -- Keep existing status if no match
  ELSE status
END,
updated_at = now()
WHERE source_report = 'orders_all' 
  AND full_option_blob IS NOT NULL 
  AND full_option_blob->>'Current Event' IS NOT NULL;

-- Update last_seen_at for these records to mark them as current
UPDATE public.inventory 
SET last_seen_at = now()
WHERE source_report = 'orders_all' 
  AND status IN ('5000', '4200', '3000');
