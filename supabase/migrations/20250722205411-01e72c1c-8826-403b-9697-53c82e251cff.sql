
-- EMERGENCY SHUTDOWN: IMMEDIATE ACTION TO STOP ALL AI AUTOMATION AND MESSAGING
-- This will completely halt all automated messaging and AI processing

-- 1. DISABLE ALL CRON JOBS FOR AI AUTOMATION
SELECT cron.unschedule('ai-automation-robust');
SELECT cron.unschedule('ai-automation-every-10-minutes');
SELECT cron.unschedule('ai-automation-scheduler');
SELECT cron.unschedule('ai-automation-every-15-minutes');
SELECT cron.unschedule('enhanced-ai-automation-peak-hours');
SELECT cron.unschedule('enhanced-ai-automation-off-peak');
SELECT cron.unschedule('ai-queue-health-monitor');

-- 2. SET EMERGENCY STOP IN AUTOMATION CONTROL
UPDATE public.ai_automation_control 
SET automation_enabled = false,
    emergency_stop = true,
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_automation_control LIMIT 1);

-- If no control record exists, create one with emergency stop
INSERT INTO public.ai_automation_control (automation_enabled, emergency_stop)
SELECT false, true
WHERE NOT EXISTS (SELECT 1 FROM public.ai_automation_control);

-- 3. UPDATE AI EMERGENCY SETTINGS TO DISABLED STATE
UPDATE public.ai_emergency_settings 
SET ai_disabled = true,
    disable_reason = 'EMERGENCY SHUTDOWN - Messages still being sent despite previous emergency stop',
    disabled_at = now(),
    disabled_by = auth.uid(),
    updated_at = now()
WHERE id = (SELECT id FROM public.ai_emergency_settings LIMIT 1);

-- If no emergency settings exist, create them in disabled state
INSERT INTO public.ai_emergency_settings (ai_disabled, disable_reason, disabled_at, disabled_by)
SELECT true, 'EMERGENCY SHUTDOWN - Messages still being sent despite previous emergency stop', now(), auth.uid()
WHERE NOT EXISTS (SELECT 1 FROM public.ai_emergency_settings);

-- 4. PAUSE ALL AI LEADS IMMEDIATELY
UPDATE public.leads 
SET ai_opt_in = false,
    ai_sequence_paused = true,
    next_ai_send_at = NULL,
    ai_stage = 'emergency_paused',
    updated_at = now()
WHERE ai_opt_in = true 
   OR next_ai_send_at IS NOT NULL
   OR ai_sequence_paused = false;

-- 5. CANCEL ALL SCHEDULED AI MESSAGES
UPDATE public.ai_message_schedule 
SET status = 'emergency_cancelled',
    updated_at = now()
WHERE status = 'scheduled';

-- 6. CANCEL ALL PENDING APPROVAL QUEUE MESSAGES
UPDATE public.ai_message_approval_queue 
SET rejected = true,
    rejection_reason = 'Emergency shutdown - all pending messages cancelled',
    rejected_at = now(),
    updated_at = now()
WHERE approved = false 
  AND rejected = false 
  AND sent_at IS NULL;

-- 7. LOG THE EMERGENCY SHUTDOWN
INSERT INTO public.ai_automation_runs (
  source,
  status,
  started_at,
  completed_at,
  error_message,
  leads_processed,
  leads_successful,
  leads_failed
) VALUES (
  'emergency_shutdown_immediate',
  'completed',
  now(),
  now(),
  'EMERGENCY SHUTDOWN: Messages still being sent despite emergency settings - immediate halt executed',
  0,
  0,
  0
);

-- 8. VERIFY SHUTDOWN STATUS
SELECT 
  'EMERGENCY SHUTDOWN VERIFICATION' as status,
  COUNT(*) as remaining_active_cron_jobs
FROM cron.job 
WHERE jobname LIKE '%ai%automation%' OR jobname LIKE '%ai-automation%';

SELECT 
  'AI Emergency Settings' as system,
  ai_disabled as is_disabled,
  disable_reason,
  disabled_at
FROM public.ai_emergency_settings
LIMIT 1;

SELECT 
  'Automation Control' as system,
  NOT automation_enabled as is_disabled,
  emergency_stop as emergency_active
FROM public.ai_automation_control
LIMIT 1;

SELECT 
  'Active AI Leads' as system,
  COUNT(*) as count
FROM public.leads 
WHERE ai_opt_in = true;

SELECT 
  'Scheduled Messages' as system,
  COUNT(*) as count
FROM public.leads 
WHERE next_ai_send_at IS NOT NULL;
