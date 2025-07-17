-- Phase 2: Create settings table for API keys and configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Managers can manage settings" ON public.settings;

-- Create policies for settings access
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

-- Insert placeholder settings if they don't exist
INSERT INTO public.settings (key, description) VALUES 
  ('OPENAI_API_KEY', 'OpenAI API key for AI message generation')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_ACCOUNT_SID', 'Twilio Account SID for SMS sending')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_AUTH_TOKEN', 'Twilio Auth Token for SMS sending')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.settings (key, description) VALUES 
  ('TWILIO_PHONE_NUMBER', 'Twilio Phone Number for SMS sending')
ON CONFLICT (key) DO NOTHING;