-- Update dealership settings for U-J Chevrolet rebrand
UPDATE public.settings 
SET value = 'U-J Chevrolet', updated_at = now()
WHERE key = 'DEALERSHIP_NAME';

UPDATE public.settings 
SET value = 'Tommy', updated_at = now()
WHERE key = 'DEFAULT_SALESPERSON_NAME';

UPDATE public.settings 
SET value = 'Mobile, AL', updated_at = now()
WHERE key = 'DEALERSHIP_LOCATION';

UPDATE public.settings 
SET value = '(251) 219-8113', updated_at = now()
WHERE key = 'DEALERSHIP_PHONE';

-- Add new settings for U-J Chevrolet
INSERT INTO public.settings (key, value, description, created_at, updated_at)
VALUES 
  ('DEALERSHIP_ADDRESS', '7581 Airport Blvd, Mobile, AL 36608', 'Full street address for U-J Chevrolet', now(), now()),
  ('DEALERSHIP_WEBSITE', 'www.ujchevy.com', 'U-J Chevrolet website URL', now(), now())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = now();