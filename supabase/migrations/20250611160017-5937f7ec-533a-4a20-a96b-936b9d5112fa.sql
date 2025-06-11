
-- Drop the unique constraint on vin column first
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_vin_key;

-- Allow NULL values in the vin column for GM Global orders without VINs
ALTER TABLE public.inventory ALTER COLUMN vin DROP NOT NULL;

-- Create a partial unique index that only applies to non-NULL VINs
CREATE UNIQUE INDEX inventory_vin_unique_idx ON public.inventory (vin) WHERE vin IS NOT NULL;

-- Ensure we have proper indexing for performance
CREATE INDEX IF NOT EXISTS inventory_stock_number_idx ON public.inventory (stock_number) WHERE stock_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_upload_history_idx ON public.inventory (upload_history_id);
