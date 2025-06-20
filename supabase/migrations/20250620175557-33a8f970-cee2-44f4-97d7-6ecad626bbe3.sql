
-- Add missing columns to leads table for better AI automation
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS ai_resume_at timestamp with time zone;

-- Add performance indexes for AI automation queries
CREATE INDEX IF NOT EXISTS idx_leads_ai_automation ON public.leads(ai_opt_in, ai_sequence_paused, next_ai_send_at) 
WHERE ai_opt_in = true AND ai_sequence_paused = false;

CREATE INDEX IF NOT EXISTS idx_leads_phone_lookup ON public.phone_numbers(lead_id, is_primary) 
WHERE is_primary = true;

-- Populate the phone column with primary phone numbers
UPDATE public.leads 
SET phone = (
  SELECT pn.number 
  FROM public.phone_numbers pn 
  WHERE pn.lead_id = leads.id 
  AND pn.is_primary = true 
  LIMIT 1
)
WHERE phone IS NULL;

-- Add some AI message templates if none exist
INSERT INTO public.ai_message_templates (stage, template, variant_name, is_active)
VALUES 
  ('initial', 'Hi {{firstName}}! I''m Finn with Jason Pilger Chevrolet. I noticed you were interested in {{vehicleInterest}}. I''d love to help you explore your options and answer any questions you might have. What brought you to look at vehicles today?', 'warm_introduction', true),
  ('follow_up', 'Hi {{firstName}}! Just wanted to follow up on your interest in {{vehicleInterest}}. Any questions I can help with? We have some great options available right now.', 'friendly_follow_up', true),
  ('engagement', 'Hey {{firstName}}! Hope you''re doing well. Still thinking about {{vehicleInterest}}? I''d be happy to schedule a time for you to come take a look or answer any questions you might have.', 'engagement_check', true)
ON CONFLICT DO NOTHING;

-- Enable pg_cron extension for scheduling (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the ai-automation function to run every 15 minutes
SELECT cron.schedule(
  'ai-automation-scheduler',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
    body := '{"automated": true}'::jsonb
  );
  $$
);
