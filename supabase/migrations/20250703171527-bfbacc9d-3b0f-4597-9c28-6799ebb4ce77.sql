-- Step 2: Clean up orphaned deals and add foreign key constraint
-- First, identify and handle deals with stock_numbers that don't exist in inventory

-- Option 1: Set stock_number to NULL for deals that don't have matching inventory
UPDATE public.deals 
SET stock_number = NULL 
WHERE stock_number IS NOT NULL 
  AND stock_number NOT IN (SELECT stock_number FROM public.inventory WHERE stock_number IS NOT NULL);

-- Now add the foreign key constraint
ALTER TABLE public.deals 
ADD CONSTRAINT fk_deals_inventory_stock_number 
FOREIGN KEY (stock_number) 
REFERENCES public.inventory(stock_number) 
ON DELETE SET NULL 
ON UPDATE CASCADE;