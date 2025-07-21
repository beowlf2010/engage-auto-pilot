
-- EMERGENCY SHUTDOWN: Complete AI automation stop to prevent customer spam
-- This will immediately stop ALL automated messaging

-- 1. EMERGENCY: Disable all AI automation cron jobs
SELECT cron.unschedule('ai-automation-robust');
SELECT cron.unschedule('ai-automation-restored'); 
SELECT cron.unschedule('ai-automation-every-15-minutes');
SELECT cron.unschedule('enhanced-ai-automation-peak-hours');
SELECT cron.unschedule('enhanced-ai-automation-off-peak');
SELECT cron.unschedule('ai-queue-health-monitor');
SELECT cron.unschedule('cleanup-stuck-automation');

-- 2. EMERGENCY: Disable automation control system
UPDATE public.ai_automation_control 
SET automation_enabled = false, 
    emergency_stop = true,
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_automation_control LIMIT 1);

-- 3. EMERGENCY: Disable AI emergency settings (backup safety)
UPDATE public.ai_emergency_settings 
SET ai_disabled = true, 
    disable_reason = 'EMERGENCY: Customer spam prevention - all AI messaging disabled',
    disabled_at = now(),
    disabled_by = auth.uid(),
    updated_at = now()
WHERE id = '237cbf27-f24a-46a8-945c-164af4ae9035';

-- 4. EMERGENCY: Disable ALL leads with AI enabled (bulk operation)
UPDATE public.leads 
SET ai_opt_in = false,
    ai_stage = 'emergency_shutdown',
    next_ai_send_at = NULL,
    ai_sequence_paused = true,
    ai_pause_reason = 'Emergency shutdown to prevent customer spam',
    updated_at = now()
WHERE ai_opt_in = true;

-- 5. EMERGENCY: Cancel ALL scheduled AI messages
UPDATE public.ai_message_schedule 
SET status = 'emergency_cancelled',
    updated_at = now()
WHERE status = 'scheduled';

-- 6. EMERGENCY: Mark any running automation as failed/stopped
UPDATE public.ai_automation_runs 
SET status = 'emergency_stopped',
    error_message = 'Emergency shutdown to prevent customer spam',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running';

-- 7. VERIFICATION: Show current status after shutdown
SELECT 
  'AI Emergency Settings' as system,
  ai_disabled as is_disabled,
  disable_reason as reason
FROM public.ai_emergency_settings
UNION ALL
SELECT 
  'Automation Control' as system,
  NOT automation_enabled as is_disabled,
  CASE WHEN emergency_stop THEN 'Emergency stop active' ELSE 'Normal operation' END as reason
FROM public.ai_automation_control
UNION ALL
SELECT 
  'AI Enabled Leads' as system,
  (COUNT(*) = 0) as is_disabled,
  CONCAT(COUNT(*), ' leads still have AI enabled') as reason
FROM public.leads 
WHERE ai_opt_in = true
UNION ALL
SELECT 
  'Scheduled Messages' as system,
  (COUNT(*) = 0) as is_disabled,
  CONCAT(COUNT(*), ' messages still scheduled') as reason
FROM public.ai_message_schedule 
WHERE status = 'scheduled'
UNION ALL
SELECT 
  'Active Cron Jobs' as system,
  (COUNT(*) = 0) as is_disabled,
  CASE WHEN COUNT(*) = 0 THEN 'All AI cron jobs disabled' ELSE CONCAT(COUNT(*), ' active AI jobs found') END as reason
FROM cron.job 
WHERE jobname LIKE '%ai%automation%';
