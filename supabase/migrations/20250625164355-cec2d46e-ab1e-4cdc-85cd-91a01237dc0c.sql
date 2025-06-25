
-- Update the leads table to allow NULL values for first_name and last_name
-- This will fix the constraint violation that's causing the "stack depth limit exceeded" errors

ALTER TABLE public.leads 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL;

-- Update any existing empty string values to NULL for consistency
UPDATE public.leads 
SET first_name = NULL 
WHERE first_name = '' OR first_name IS NULL;

UPDATE public.leads 
SET last_name = NULL 
WHERE last_name = '' OR last_name IS NULL;
