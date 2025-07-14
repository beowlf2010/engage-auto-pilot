-- Emergency cleanup for additional stuck AI automation runs (Phase 1)
-- Clean up any automation runs that are still stuck and running longer than 5 minutes
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Job timeout - emergency cleanup batch 2',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '5 minutes';

-- Verify cleanup and show current system state
SELECT 
  id, 
  status, 
  started_at, 
  completed_at, 
  error_message, 
  leads_processed,
  source,
  EXTRACT(EPOCH FROM (COALESCE(completed_at, now()) - started_at)) / 60 as runtime_minutes
FROM ai_automation_runs 
WHERE created_at > now() - interval '2 hours'
ORDER BY created_at DESC 
LIMIT 10;