-- Cleanup and monitoring improvements for AI automation

-- First, clear stuck automation runs from July 15th (older than 2 days)
UPDATE ai_automation_runs 
SET status = 'failed', 
    error_message = 'Cleared by cleanup - stuck run detected',
    completed_at = NOW()
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '2 days';

-- Clear expired automation locks (older than 30 minutes)
DELETE FROM ai_automation_locks 
WHERE expires_at < NOW();

-- Add timeout configuration to automation control
INSERT INTO ai_automation_control (id, automation_enabled, max_concurrent_runs, global_timeout_minutes, emergency_stop)
VALUES ('main_control', true, 3, 4, false)
ON CONFLICT (id) 
DO UPDATE SET 
  max_concurrent_runs = 3,
  global_timeout_minutes = 4,
  emergency_stop = false,
  updated_at = NOW();

-- Create function to automatically cleanup stuck processes
CREATE OR REPLACE FUNCTION cleanup_stuck_automation_processes()
RETURNS void AS $$
BEGIN
  -- Clear runs stuck for more than 30 minutes
  UPDATE ai_automation_runs 
  SET status = 'failed', 
      error_message = 'Auto-cleanup: process timeout',
      completed_at = NOW()
  WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '30 minutes';

  -- Clear expired locks
  DELETE FROM ai_automation_locks 
  WHERE expires_at < NOW();

  -- Log cleanup action
  INSERT INTO ai_automation_runs (source, status, metadata, started_at, completed_at)
  VALUES (
    'auto_cleanup', 
    'completed',
    jsonb_build_object(
      'cleanup_type', 'stuck_processes',
      'timestamp', NOW()
    ),
    NOW(),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create monitoring function to check system health
CREATE OR REPLACE FUNCTION get_automation_health_status()
RETURNS jsonb AS $$
DECLARE
  stuck_runs integer;
  failed_last_hour integer;
  success_rate numeric;
  health_score integer;
BEGIN
  -- Count stuck runs
  SELECT COUNT(*) INTO stuck_runs
  FROM ai_automation_runs 
  WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '30 minutes';

  -- Count failures in last hour
  SELECT COUNT(*) INTO failed_last_hour
  FROM ai_automation_runs 
  WHERE status = 'failed' 
  AND started_at >= NOW() - INTERVAL '1 hour';

  -- Calculate success rate for last 24 hours
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100)
    END INTO success_rate
  FROM ai_automation_runs 
  WHERE started_at >= NOW() - INTERVAL '24 hours';

  -- Calculate health score
  health_score := CASE
    WHEN stuck_runs > 0 THEN 30
    WHEN failed_last_hour > 5 THEN 50
    WHEN success_rate < 80 THEN 70
    WHEN success_rate < 95 THEN 85
    ELSE 100
  END;

  RETURN jsonb_build_object(
    'health_score', health_score,
    'stuck_runs', stuck_runs,
    'failed_last_hour', failed_last_hour,
    'success_rate_24h', COALESCE(success_rate, 0),
    'needs_attention', health_score < 80,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic cleanup every 15 minutes
SELECT cron.schedule(
  'automation-cleanup',
  '*/15 * * * *',
  'SELECT cleanup_stuck_automation_processes();'
);

-- Update queue health tracking
INSERT INTO ai_queue_health (queue_health_score, total_processing, total_overdue, total_failed)
SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes') > 0 THEN 40
    WHEN COUNT(*) FILTER (WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '1 hour') > 3 THEN 60
    ELSE 100
  END as health_score,
  COUNT(*) FILTER (WHERE status = 'running') as processing,
  COUNT(*) FILTER (WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes') as overdue,
  COUNT(*) FILTER (WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '1 hour') as failed
FROM ai_automation_runs 
WHERE started_at >= NOW() - INTERVAL '2 hours';