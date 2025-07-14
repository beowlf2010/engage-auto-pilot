-- Phase 1: Emergency Recovery - Clean up hanging job and verify cron setup

-- Clean up the hanging 20:40 job that's blocking the system
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - emergency cleanup after concurrency fix',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '10 minutes';

-- Verify the new cron job exists and is active
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'ai-automation-robust';

-- If the cron job doesn't exist, recreate it
SELECT cron.schedule(
  'ai-automation-robust',
  '*/10 * * * *', -- Every 10 minutes
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "cron_robust_recovery", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
) 
WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ai-automation-robust'
);

-- Show current automation control settings
SELECT 
  automation_enabled,
  emergency_stop,
  max_concurrent_runs,
  global_timeout_minutes,
  updated_at
FROM ai_automation_control 
LIMIT 1;

-- Show recent automation runs to verify cleanup
SELECT 
  id,
  source,
  status,
  started_at,
  completed_at,
  leads_processed,
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '3 hours'
ORDER BY created_at DESC 
LIMIT 10;