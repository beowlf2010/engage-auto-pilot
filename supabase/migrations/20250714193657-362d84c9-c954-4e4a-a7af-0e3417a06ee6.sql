-- Emergency fix for stuck AI automation system
-- Step 1: Clean up the currently stuck automation run
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - emergency cleanup',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '5 minutes';

-- Step 2: Reset overdue leads to be processed immediately
UPDATE leads 
SET next_ai_send_at = now() + interval '2 minutes',
    ai_sequence_paused = false
WHERE ai_opt_in = true 
AND next_ai_send_at IS NOT NULL 
AND next_ai_send_at < now() - interval '5 minutes';

-- Step 3: Verify system health by checking recent automation runs
SELECT id, status, started_at, completed_at, error_message, leads_processed
FROM ai_automation_runs 
WHERE created_at > now() - interval '1 hour'
ORDER BY created_at DESC 
LIMIT 5;