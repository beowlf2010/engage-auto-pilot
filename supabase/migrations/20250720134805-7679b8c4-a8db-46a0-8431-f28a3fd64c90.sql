
-- Update dealership settings to use Finn at Jason Pilger Chevrolet
UPDATE public.settings 
SET value = 'Jason Pilger Chevrolet'
WHERE key = 'DEALERSHIP_NAME';

UPDATE public.settings 
SET value = 'Finn'
WHERE key = 'DEFAULT_SALESPERSON_NAME';

UPDATE public.settings 
SET value = 'Atmore, AL'
WHERE key = 'DEALERSHIP_LOCATION';

-- Add phone number if not exists or update if needed
INSERT INTO public.settings (key, value, description) VALUES
('DEALERSHIP_PHONE', '(251) 368-8600', 'Main dealership phone number for AI messages')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();
