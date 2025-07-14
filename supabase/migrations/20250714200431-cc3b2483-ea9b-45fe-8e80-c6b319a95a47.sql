-- Clean up the currently running stuck job from 20:00
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - cleaned up before timeout fix deployment',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '3 minutes';

-- Verify the cleanup
SELECT 
  id, 
  status, 
  started_at, 
  completed_at, 
  error_message,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '30 minutes'
ORDER BY created_at DESC 
LIMIT 3;