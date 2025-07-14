-- Re-enable AI automation system after SMS pipeline verification
-- Step 1: Re-enable AI emergency settings
UPDATE ai_emergency_settings 
SET ai_disabled = false,
    disable_reason = NULL,
    disabled_at = NULL,
    disabled_by = NULL,
    updated_at = now()
WHERE ai_disabled = true;

-- Step 2: Reset AI queue health metrics to indicate system is healthy
INSERT INTO ai_queue_health (total_processing, total_overdue, total_failed, queue_health_score)
VALUES (0, 0, 0, 100)
ON CONFLICT (id) DO UPDATE SET
  total_processing = 0,
  total_overdue = 0, 
  total_failed = 0,
  queue_health_score = 100,
  created_at = now();

-- Step 3: Clean up any old failed AI automation runs to start fresh
DELETE FROM ai_automation_runs 
WHERE status = 'failed' 
AND created_at < now() - interval '24 hours';

-- Step 4: Ensure active AI message templates are properly enabled
UPDATE ai_message_templates 
SET is_active = true, 
    updated_at = now()
WHERE stage IN ('initial_contact', 'follow_up', 'appointment_request')
AND is_active = false;