-- Step 2: Add foreign key constraint between deals and inventory
-- This will allow PostgREST to properly resolve the relationship for JOINs

ALTER TABLE public.deals 
ADD CONSTRAINT fk_deals_inventory_stock_number 
FOREIGN KEY (stock_number) 
REFERENCES public.inventory(stock_number) 
ON DELETE SET NULL 
ON UPDATE CASCADE;