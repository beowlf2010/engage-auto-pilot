-- Create a default AI emergency settings record if none exists
INSERT INTO public.ai_emergency_settings (ai_disabled, disable_reason, created_at, updated_at)
SELECT false, 'Default settings', now(), now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_emergency_settings
);