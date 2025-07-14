-- Clean up remaining stuck automation runs
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - cleaned up after timeout fix deployment',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '5 minutes';

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