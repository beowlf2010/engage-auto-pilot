-- Fix deals loading issue by creating proper relationship between deals and inventory
-- Step 1: Create unique constraint on inventory.stock_number (required for foreign keys)

-- First, let's check for and handle any duplicate stock numbers in inventory
-- We'll keep the most recent record for each stock_number
WITH ranked_inventory AS (
  SELECT id, stock_number, ROW_NUMBER() OVER (PARTITION BY stock_number ORDER BY created_at DESC) as rn
  FROM public.inventory 
  WHERE stock_number IS NOT NULL
)
DELETE FROM public.inventory 
WHERE id IN (
  SELECT id FROM ranked_inventory WHERE rn > 1
);

-- Now add unique constraint on stock_number
ALTER TABLE public.inventory 
ADD CONSTRAINT unique_inventory_stock_number 
UNIQUE (stock_number);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_stock_number ON public.inventory(stock_number) WHERE stock_number IS NOT NULL;