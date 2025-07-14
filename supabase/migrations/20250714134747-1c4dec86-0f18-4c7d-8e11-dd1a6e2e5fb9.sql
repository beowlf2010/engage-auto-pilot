-- Re-enable AI automation system properly
-- Step 1: Re-enable AI emergency settings
UPDATE ai_emergency_settings 
SET ai_disabled = false, 
    disable_reason = NULL,
    disabled_at = NULL,
    updated_at = now()
WHERE ai_disabled = true;

-- Step 2: Reactivate key AI message templates
UPDATE ai_message_templates 
SET is_active = true, 
    updated_at = now()
WHERE stage IN ('initial_contact', 'follow_up', 'appointment_request')
AND is_active = false;

-- Step 3: Set up a test group of leads for AI messaging (start with 10 recent leads)
WITH recent_leads AS (
  SELECT id 
  FROM leads 
  WHERE created_at > now() - interval '30 days'
  AND status != 'closed'
  AND ai_opt_in = false
  ORDER BY created_at DESC 
  LIMIT 10
)
UPDATE leads 
SET ai_opt_in = true,
    ai_stage = 'active',
    next_ai_send_at = now() + interval '1 hour',
    message_intensity = 'gentle',
    ai_aggression_level = 3,
    updated_at = now()
WHERE id IN (SELECT id FROM recent_leads);

-- Step 4: Clean up any old failed AI automation runs
DELETE FROM ai_automation_runs 
WHERE status = 'failed' 
AND created_at < now() - interval '7 days';

-- Step 5: Reset AI queue health metrics
INSERT INTO ai_queue_health (total_processing, total_overdue, total_failed, queue_health_score)
VALUES (0, 0, 0, 100)
ON CONFLICT (id) DO UPDATE SET
  total_processing = 0,
  total_overdue = 0, 
  total_failed = 0,
  queue_health_score = 100,
  created_at = now();