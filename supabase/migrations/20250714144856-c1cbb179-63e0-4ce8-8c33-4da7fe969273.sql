-- Re-enable AI automation cron job
SELECT cron.schedule(
  'ai-automation-restored',
  '*/15 * * * *', -- Every 15 minutes
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU4ODI0NywiZXhwIjoyMDY1MTY0MjQ3fQ.DY_OZ7YEKDMIXkqc_bZQ76K6VPpGWgOoTUEfhyNYh28"}'::jsonb,
      body:='{"automated": true, "source": "cron_restored", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
);