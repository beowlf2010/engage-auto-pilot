-- Add foreign key relationship between deals and inventory tables
-- This will fix the deals loading issue by allowing proper JOINs

-- First, let's add an index on inventory.stock_number for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_stock_number ON public.inventory(stock_number) WHERE stock_number IS NOT NULL;

-- Add foreign key constraint between deals.stock_number and inventory.stock_number
-- Using ON DELETE SET NULL to handle cases where inventory might be deleted
ALTER TABLE public.deals 
ADD CONSTRAINT fk_deals_inventory_stock_number 
FOREIGN KEY (stock_number) 
REFERENCES public.inventory(stock_number) 
ON DELETE SET NULL 
ON UPDATE CASCADE;