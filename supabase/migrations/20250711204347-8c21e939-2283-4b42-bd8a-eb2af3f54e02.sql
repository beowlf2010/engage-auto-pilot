-- Fix the cron job to use service role key instead of anon key
SELECT cron.unschedule('ai-automation-scheduler');

SELECT cron.schedule(
  'ai-automation-scheduler',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU4ODI0NywiZXhwIjoyMDY1MTY0MjQ3fQ.DY_OZ7YEKDMIXkqc_bZQ76K6VPpGWgOoTUEfhyNYh28"}'::jsonb,
    body := '{"automated": true, "source": "cron"}'::jsonb
  );
  $$
);