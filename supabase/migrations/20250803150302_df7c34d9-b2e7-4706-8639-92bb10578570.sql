-- FINAL BATCH: Complete the last 16 functions for complete security hardening

-- Fix the remaining 16 functions
ALTER FUNCTION public.repair_upload_inconsistencies() SET search_path TO 'public';
ALTER FUNCTION public.reprocess_failed_upload(uuid) SET search_path TO 'public';
ALTER FUNCTION public.revoke_all_user_sessions(uuid) SET search_path TO 'public';
ALTER FUNCTION public.schedule_next_ai_message() SET search_path TO 'public';
ALTER FUNCTION public.set_primary_phone(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.sync_profile_role_to_user_roles() SET search_path TO 'public';
ALTER FUNCTION public.synchronize_user_roles(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.trigger_ai_automation_manual() SET search_path TO 'public';
ALTER FUNCTION public.trigger_emergency_ai_shutdown() SET search_path TO 'public';
ALTER FUNCTION public.trigger_lead_score_update() SET search_path TO 'public';
ALTER FUNCTION public.update_inventory_days() SET search_path TO 'public';
ALTER FUNCTION public.update_lead_score() SET search_path TO 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.validate_ai_message_content(text, uuid) SET search_path TO 'public';
ALTER FUNCTION public.validate_lead_phone_for_ai() SET search_path TO 'public';
ALTER FUNCTION public.validate_upload_context(uuid) SET search_path TO 'public';

-- Final verification: Check function security status
SELECT 
  COUNT(*) as total_functions,
  COUNT(*) FILTER (WHERE 'search_path=public' = ANY(proconfig)) as secured_functions,
  COUNT(*) FILTER (WHERE 'search_path=public' != ALL(COALESCE(proconfig, ARRAY[]::text[]))) as remaining_unsecured
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f';

-- Show any remaining unsecured functions (should be 0)
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND 'search_path=public' != ALL(COALESCE(p.proconfig, ARRAY[]::text[]))
ORDER BY p.proname;