
-- EMERGENCY SHUTDOWN: Disable all AI automation and outgoing messages
-- This will completely stop all automated messaging while fixing Smart Inbox

-- 1. Emergency disable AI system
UPDATE public.ai_emergency_settings 
SET ai_disabled = true, 
    disable_reason = 'Emergency shutdown for Smart Inbox fixes',
    disabled_at = now(),
    updated_at = now()
WHERE id = '237cbf27-f24a-46a8-945c-164af4ae9035';

-- 2. Disable all cron jobs for AI automation
SELECT cron.unschedule('ai-automation-robust');
SELECT cron.unschedule('cleanup-stuck-automation'); 

-- 3. Pause all leads with pending AI messages
UPDATE public.leads 
SET ai_opt_in = false,
    ai_stage = 'emergency_paused',
    next_ai_send_at = NULL,
    ai_sequence_paused = true,
    updated_at = now()
WHERE ai_opt_in = true OR next_ai_send_at IS NOT NULL;

-- 4. Clear any scheduled AI message queue
UPDATE public.ai_message_schedule 
SET status = 'cancelled',
    updated_at = now()
WHERE status = 'scheduled';

-- 5. Add emergency shutdown check to automation control
UPDATE public.ai_automation_control 
SET automation_enabled = false, 
    emergency_stop = true,
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_automation_control LIMIT 1);

-- 6. Log the emergency shutdown
INSERT INTO public.ai_automation_runs (
  source,
  status,
  started_at,
  completed_at,
  error_message,
  processed_leads,
  successful_sends,
  failed_sends
) VALUES (
  'emergency_shutdown',
  'completed',
  now(),
  now(),
  'Emergency shutdown initiated for Smart Inbox fixes',
  0,
  0,
  0
);

-- Verify shutdown status
SELECT 
  'AI Emergency Settings' as system,
  ai_disabled as disabled_status,
  disable_reason
FROM public.ai_emergency_settings
UNION ALL
SELECT 
  'Automation Control' as system,
  NOT automation_enabled as disabled_status,
  CASE WHEN emergency_stop THEN 'Emergency stop active' ELSE 'Normal' END as disable_reason
FROM public.ai_automation_control
UNION ALL
SELECT 
  'Active Cron Jobs' as system,
  (COUNT(*) = 0) as disabled_status,
  CASE WHEN COUNT(*) = 0 THEN 'All AI cron jobs disabled' ELSE CONCAT(COUNT(*), ' active jobs found') END as disable_reason
FROM cron.job 
WHERE jobname LIKE '%ai%automation%';
