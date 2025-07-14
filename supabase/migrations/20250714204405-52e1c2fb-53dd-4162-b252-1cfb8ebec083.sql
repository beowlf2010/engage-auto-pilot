-- Phase 1: Emergency cleanup and disable cron job temporarily
-- Clean up remaining stuck automation runs
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - cleaned up after timeout fix deployment',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '5 minutes';

-- Disable the problematic cron job temporarily
SELECT cron.unschedule('ai-automation-fixed');

-- Add emergency kill switch table
CREATE TABLE IF NOT EXISTS public.ai_automation_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_enabled boolean DEFAULT true,
  emergency_stop boolean DEFAULT false,
  max_concurrent_runs integer DEFAULT 1,
  global_timeout_minutes integer DEFAULT 4,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default control settings
INSERT INTO public.ai_automation_control (automation_enabled, emergency_stop)
VALUES (false, false) -- Start disabled for safety
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on control table
ALTER TABLE public.ai_automation_control ENABLE ROW LEVEL SECURITY;

-- Create policy for managers to control automation
CREATE POLICY "Managers can manage automation control"
ON public.ai_automation_control
FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
));

-- Verify current state
SELECT 
  id, 
  status, 
  started_at, 
  completed_at, 
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC 
LIMIT 10;