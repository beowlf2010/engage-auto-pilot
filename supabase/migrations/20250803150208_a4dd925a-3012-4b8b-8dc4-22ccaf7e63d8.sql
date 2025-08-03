-- COMPLETE SECURITY HARDENING: Fix all remaining 36 functions
-- Based on the query results, fix all remaining functions

-- Fix the 20 functions from the first batch
ALTER FUNCTION public.auto_suppress_failed_numbers() SET search_path TO 'public';
ALTER FUNCTION public.auto_suppress_high_failure_numbers() SET search_path TO 'public';
ALTER FUNCTION public.calculate_lead_score(uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_next_ai_send_time(uuid, integer, integer) SET search_path TO 'public';
ALTER FUNCTION public.check_ai_automation_health() SET search_path TO 'public';
ALTER FUNCTION public.check_message_rate_limit(text, integer) SET search_path TO 'public';
ALTER FUNCTION public.cleanup_stuck_automation_runs() SET search_path TO 'public';
ALTER FUNCTION public.detect_mass_message_failures() SET search_path TO 'public';
ALTER FUNCTION public.detect_suspicious_activity(uuid, integer) SET search_path TO 'public';
ALTER FUNCTION public.enforce_message_rate_limit() SET search_path TO 'public';
ALTER FUNCTION public.find_matching_inventory(uuid) SET search_path TO 'public';
ALTER FUNCTION public.generate_daily_ai_insights() SET search_path TO 'public';
ALTER FUNCTION public.get_inbox_conversations_prioritized() SET search_path TO 'public';
ALTER FUNCTION public.get_inbox_conversations_prioritized_limited() SET search_path TO 'public';
ALTER FUNCTION public.get_latest_conversations_per_lead() SET search_path TO 'public';
ALTER FUNCTION public.get_stuck_leads_report() SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.log_failed_login_attempt(text, inet, text) SET search_path TO 'public';
ALTER FUNCTION public.normalize_phone(text) SET search_path TO 'public';
ALTER FUNCTION public.promote_user_to_admin(uuid, text) SET search_path TO 'public';

-- Get the next batch of remaining functions
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND 'search_path=public' != ALL(COALESCE(p.proconfig, ARRAY[]::text[]))
ORDER BY p.proname
LIMIT 16;