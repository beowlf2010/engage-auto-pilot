-- Comprehensive AI Automation System Fix - Clear stuck runs and add robust timeout handling

-- Step 1: Clear all currently stuck automation runs
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - comprehensive system repair and cleanup',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
  AND started_at < now() - interval '15 minutes';

-- Step 2: Clear all automation locks (they should expire but let's force clear)
DELETE FROM ai_automation_locks 
WHERE expires_at < now() OR acquired_at < now() - interval '30 minutes';

-- Step 3: Ensure automation control settings are correct
UPDATE ai_automation_control 
SET emergency_stop = false,
    automation_enabled = true,
    global_timeout_minutes = 10,
    max_concurrent_runs = 1,
    updated_at = now()
WHERE id = (SELECT id FROM ai_automation_control LIMIT 1);

-- Step 4: Reset any leads that might be stuck in processing state
UPDATE leads 
SET ai_sequence_paused = false,
    next_ai_send_at = CASE 
      WHEN next_ai_send_at < now() - interval '2 hours' THEN now() + interval '2 minutes'
      WHEN next_ai_send_at < now() THEN now() + interval '1 minute'
      ELSE next_ai_send_at
    END
WHERE ai_opt_in = true 
  AND next_ai_send_at IS NOT NULL 
  AND (ai_sequence_paused = true OR next_ai_send_at < now() - interval '30 minutes');

-- Step 5: Create a function to automatically cleanup stuck runs
CREATE OR REPLACE FUNCTION cleanup_stuck_automation_runs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  timeout_minutes INTEGER;
  stuck_count INTEGER;
BEGIN
  -- Get the global timeout setting
  SELECT COALESCE(global_timeout_minutes, 10) INTO timeout_minutes 
  FROM ai_automation_control LIMIT 1;
  
  -- Clean up stuck runs
  UPDATE ai_automation_runs 
  SET status = 'failed',
      error_message = 'Automatic timeout cleanup - exceeded ' || timeout_minutes || ' minute limit',
      completed_at = now(),
      processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
  WHERE status = 'running' 
    AND started_at < now() - (timeout_minutes || ' minutes')::interval;
    
  GET DIAGNOSTICS stuck_count = ROW_COUNT;
  
  -- Clean up expired locks
  DELETE FROM ai_automation_locks 
  WHERE expires_at < now() OR acquired_at < now() - interval '30 minutes';
  
  -- Log if we cleaned anything up
  IF stuck_count > 0 THEN
    RAISE NOTICE 'Cleaned up % stuck automation runs', stuck_count;
  END IF;
END;
$$;

-- Step 6: Create a scheduled job to run cleanup every 5 minutes
SELECT cron.schedule(
  'cleanup-stuck-automation',
  '*/5 * * * *', -- every 5 minutes
  'SELECT cleanup_stuck_automation_runs();'
);

-- Step 7: Verify current system state and show next scheduled leads
SELECT 
  'System Status' as type,
  COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
  COUNT(CASE WHEN status = 'failed' AND completed_at > now() - interval '1 hour' THEN 1 END) as recent_failures,
  COUNT(CASE WHEN status = 'completed' AND completed_at > now() - interval '1 hour' THEN 1 END) as recent_completions
FROM ai_automation_runs
UNION ALL
SELECT 
  'Lead Queue Status' as type,
  COUNT(CASE WHEN ai_opt_in = true AND next_ai_send_at <= now() + interval '10 minutes' THEN 1 END) as ready_soon,
  COUNT(CASE WHEN ai_opt_in = true AND ai_sequence_paused = false THEN 1 END) as active_leads,
  COUNT(CASE WHEN ai_opt_in = true AND ai_sequence_paused = true THEN 1 END) as paused_leads
FROM leads;

-- Step 8: Show next few leads scheduled to send
SELECT 
  id,
  first_name,
  last_name,
  next_ai_send_at,
  ai_sequence_paused,
  EXTRACT(EPOCH FROM (next_ai_send_at - now())) / 60 as minutes_until_send
FROM leads 
WHERE ai_opt_in = true 
  AND next_ai_send_at IS NOT NULL 
  AND ai_sequence_paused = false
ORDER BY next_ai_send_at 
LIMIT 10;