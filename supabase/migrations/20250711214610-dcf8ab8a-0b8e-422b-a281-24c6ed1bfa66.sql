-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Check existing cron jobs using correct column names
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname LIKE '%ai%';

-- Drop existing jobs if they exist
SELECT cron.unschedule('enhanced-ai-automation-peak-hours');
SELECT cron.unschedule('enhanced-ai-automation-off-peak'); 
SELECT cron.unschedule('ai-queue-health-monitor');

-- Create new cron job that runs every 10 minutes
SELECT cron.schedule(
  'ai-automation-every-10-minutes',
  '*/10 * * * *', -- Every 10 minutes for testing
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "cron_job", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the job was created
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'ai-automation-every-10-minutes';