-- Fix cron job URL and check status
-- First, check if cron jobs exist in pg_cron extension
SELECT job_name, schedule, command, active 
FROM cron.job 
WHERE job_name LIKE '%ai%';

-- If that fails, check if we need to enable the extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron jobs and recreate with correct URL
SELECT cron.unschedule('enhanced-ai-automation-peak-hours');
SELECT cron.unschedule('enhanced-ai-automation-off-peak');
SELECT cron.unschedule('ai-queue-health-monitor');

-- Create the correct cron job with proper URL format
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

-- Check if the job was created successfully  
SELECT job_name, schedule, command, active FROM cron.job WHERE job_name = 'ai-automation-every-10-minutes';