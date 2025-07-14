-- Fix AI automation system issues
-- Step 1: Fix cron job authorization - update to use anon key instead of service_role
SELECT cron.unschedule('ai-automation-every-10-minutes');

-- Create new cron job with correct anon key for proper authentication
SELECT cron.schedule(
  'ai-automation-every-10-minutes',
  '*/10 * * * *', -- Every 10 minutes (optimized from 15 minutes)
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "cron_job", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
);

-- Step 2: Clean up stuck automation runs
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - cleaned up during system fix',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '30 minutes';

-- Step 3: Reset leads that may be stuck due to failed automation
UPDATE leads 
SET ai_sequence_paused = false,
    next_ai_send_at = CASE 
      WHEN next_ai_send_at < now() - interval '1 hour' THEN now() + interval '5 minutes'
      ELSE next_ai_send_at
    END
WHERE ai_opt_in = true 
AND next_ai_send_at IS NOT NULL 
AND next_ai_send_at < now() - interval '30 minutes';

-- Step 4: Verify cron job is properly scheduled
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'ai-automation-every-10-minutes';