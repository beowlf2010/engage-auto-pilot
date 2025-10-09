-- Ensure Twilio settings exist in settings table
INSERT INTO public.settings (key, value, description, created_at, updated_at)
VALUES 
  ('TWILIO_ACCOUNT_SID', '', 'Twilio Account SID for SMS services', now(), now()),
  ('TWILIO_AUTH_TOKEN', '', 'Twilio Auth Token for SMS services', now(), now()),
  ('TWILIO_PHONE_NUMBER', '', 'Twilio phone number for outbound SMS', now(), now())
ON CONFLICT (key) DO NOTHING;

-- Create cron job to trigger AI automation every 10 minutes
SELECT cron.schedule(
  'ai-automation-scheduler',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
    body := '{"automated": true, "source": "cron", "priority": "normal"}'::jsonb
  ) as request_id;
  $$
);