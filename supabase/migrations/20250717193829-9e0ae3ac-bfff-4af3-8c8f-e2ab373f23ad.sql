-- Phase 2: Fix settings table structure and add missing API keys
-- Add description column if it doesn't exist
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS description text;

-- Ensure RLS is enabled
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure it's correct
DROP POLICY IF EXISTS "Managers can manage settings" ON public.settings;

CREATE POLICY "Managers can manage settings" 
ON public.settings 
FOR ALL 
USING (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
))
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
));

-- Insert required API key placeholders if they don't exist
INSERT INTO public.settings (key, description) VALUES 
  ('OPENAI_API_KEY', 'OpenAI API key for AI message generation')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_ACCOUNT_SID', 'Twilio Account SID for SMS sending')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_AUTH_TOKEN', 'Twilio Auth Token for SMS sending')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_PHONE_NUMBER', 'Twilio Phone Number for SMS sending')
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;