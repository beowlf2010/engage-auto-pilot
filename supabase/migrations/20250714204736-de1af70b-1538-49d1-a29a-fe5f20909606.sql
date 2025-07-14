-- Create locks table for concurrency control
CREATE TABLE IF NOT EXISTS public.ai_automation_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_name text NOT NULL UNIQUE,
  lock_id text NOT NULL,
  acquired_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on locks table
ALTER TABLE public.ai_automation_locks ENABLE ROW LEVEL SECURITY;

-- Create policy for system access to locks
CREATE POLICY "System can manage automation locks"
ON public.ai_automation_locks
FOR ALL
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ai_automation_locks_name ON public.ai_automation_locks(lock_name);
CREATE INDEX IF NOT EXISTS idx_ai_automation_locks_expires ON public.ai_automation_locks(expires_at);

-- Enable the automation system (Phase 4: Re-enablement)
UPDATE public.ai_automation_control 
SET automation_enabled = true, 
    emergency_stop = false,
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_automation_control LIMIT 1);

-- Create the enhanced cron job with better error handling
SELECT cron.schedule(
  'ai-automation-robust',
  '*/10 * * * *', -- Every 10 minutes
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "cron_robust", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the new cron job is active
SELECT jobname, schedule, command, active 
FROM cron.job 
WHERE jobname = 'ai-automation-robust';

-- Show current system status
SELECT 
  'automation_control' as table_name,
  automation_enabled,
  emergency_stop,
  max_concurrent_runs,
  global_timeout_minutes
FROM public.ai_automation_control
LIMIT 1;

-- Show recent automation runs
SELECT 
  id,
  source,
  status,
  started_at,
  completed_at,
  leads_processed,
  leads_successful,
  leads_failed,
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '2 hours'
ORDER BY created_at DESC 
LIMIT 5;