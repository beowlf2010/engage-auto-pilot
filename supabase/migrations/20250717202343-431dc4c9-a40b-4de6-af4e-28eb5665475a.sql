-- Fix stuck AI automation system - Clear blocked runs and reset system
-- Step 1: Clean up the specific stuck automation run that's blocking the system
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - emergency cleanup after system health check failure',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE id = '6c4fbc1e-189f-4054-92aa-800f612cb159'
  OR (status = 'running' AND started_at < now() - interval '30 minutes');

-- Step 2: Clear all expired automation locks to prevent blocking
DELETE FROM ai_automation_locks 
WHERE expires_at < now() 
   OR acquired_at < now() - interval '30 minutes';

-- Step 3: Ensure automation control settings are correct
UPDATE ai_automation_control 
SET emergency_stop = false,
    automation_enabled = true,
    updated_at = now()
WHERE id = (SELECT id FROM ai_automation_control LIMIT 1);

-- Step 4: Reset any leads that might have been stuck in processing
UPDATE leads 
SET ai_sequence_paused = false,
    next_ai_send_at = CASE 
      WHEN next_ai_send_at < now() - interval '2 hours' THEN now() + interval '5 minutes'
      ELSE next_ai_send_at
    END
WHERE ai_opt_in = true 
  AND next_ai_send_at IS NOT NULL 
  AND next_ai_send_at < now() - interval '1 hour';

-- Step 5: Verify current system state
SELECT 
  id,
  status,
  started_at,
  completed_at,
  error_message,
  leads_processed,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '6 hours'
ORDER BY created_at DESC 
LIMIT 10;