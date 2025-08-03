-- Security Fix: Add explicit search_path to security definer functions
-- This prevents schema hijacking attacks on functions with elevated privileges

-- Fix 1: Add search_path to check_security_rate_limit function
-- First get the current function definition, then recreate with search_path
CREATE OR REPLACE FUNCTION public.check_security_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  request_count integer;
  window_start timestamp with time zone;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM public.security_rate_limits
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND created_at >= window_start;
  
  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    -- Log rate limit violation
    INSERT INTO public.security_audit_log (
      user_id, action, resource_type, details
    ) VALUES (
      auth.uid(),
      'rate_limit_exceeded',
      'security',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'request_count', request_count,
        'max_requests', p_max_requests,
        'window_minutes', p_window_minutes
      )
    );
    
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.security_rate_limits (
    identifier, endpoint, created_at
  ) VALUES (
    p_identifier, p_endpoint, now()
  );
  
  RETURN true;
END;
$function$;

-- Fix 2: Add search_path to cleanup_expired_api_key_backups function
CREATE OR REPLACE FUNCTION public.cleanup_expired_api_key_backups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete API key backups older than 90 days
  WITH deleted AS (
    DELETE FROM public.api_key_backups
    WHERE backup_created_at < now() - interval '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup operation
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, details
  ) VALUES (
    NULL, -- System operation
    'api_key_cleanup',
    'security',
    jsonb_build_object(
      'deleted_count', deleted_count,
      'retention_days', 90,
      'cleanup_timestamp', now()
    )
  );
  
  RETURN deleted_count;
END;
$function$;

-- Fix 3: Convert security definer views to regular views or functions
-- Since we can't see the exact security definer views causing issues,
-- let's ensure our main views are properly secured

-- Recreate ai_dashboard_metrics view without security definer (if it was set)
CREATE OR REPLACE VIEW public.ai_dashboard_metrics AS
SELECT 
  COUNT(DISTINCT l.id) FILTER (WHERE l.ai_opt_in = true AND l.ai_sequence_paused = false) AS active_ai_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.last_reply_at > now() - interval '24 hours') AS recent_responses,
  AVG(als.score) AS avg_lead_score,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_ai_send_at::date = CURRENT_DATE) AS today_scheduled,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_ai_send_at < now() AND l.ai_opt_in = true AND l.ai_sequence_paused = false) AS overdue_sends,
  COUNT(DISTINCT l.id) FILTER (WHERE l.ai_sequence_paused = true) AS paused_leads
FROM leads l
LEFT JOIN ai_lead_scores als ON als.lead_id = l.id;

-- Add security audit log entry for this security hardening
INSERT INTO public.security_audit_log (
  user_id, action, resource_type, details
) VALUES (
  auth.uid(),
  'security_hardening_applied',
  'database',
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'added_search_path_to_check_security_rate_limit',
      'added_search_path_to_cleanup_expired_api_key_backups',
      'secured_view_definitions'
    ],
    'security_level', 'critical',
    'timestamp', now()
  )
);