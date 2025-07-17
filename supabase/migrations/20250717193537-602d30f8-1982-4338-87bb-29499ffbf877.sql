-- Phase 1: Clear stuck automation runs and locks
-- Clean up stuck automation runs (running for more than 10 minutes)
UPDATE ai_automation_runs 
SET status = 'failed',
    error_message = 'Timeout - cleaned up during system repair',
    completed_at = now(),
    processing_time_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000
WHERE status = 'running' 
AND started_at < now() - interval '10 minutes';

-- Clear all automation locks (they should expire but let's force clear)
DELETE FROM ai_automation_locks 
WHERE expires_at < now() OR acquired_at < now() - interval '20 minutes';

-- Reset any leads that might be stuck in processing state
UPDATE leads 
SET ai_sequence_paused = false,
    next_ai_send_at = CASE 
      WHEN next_ai_send_at < now() - interval '2 hours' THEN now() + interval '2 minutes'
      ELSE next_ai_send_at
    END
WHERE ai_opt_in = true 
AND next_ai_send_at IS NOT NULL 
AND next_ai_send_at < now() - interval '1 hour';