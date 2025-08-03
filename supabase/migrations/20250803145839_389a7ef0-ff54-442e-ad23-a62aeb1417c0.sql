-- PHASE 2: Continue hardening remaining database functions with search_path
-- This prevents schema manipulation attacks and SQL injection

-- Continue fixing search_path for remaining functions

-- Fix remaining critical functions that don't have search_path set
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.user_has_manager_access() SET search_path TO 'public';
ALTER FUNCTION public.user_is_authenticated_simple() SET search_path TO 'public';
ALTER FUNCTION public.get_dealership_context() SET search_path TO 'public';
ALTER FUNCTION public.generate_booking_token() SET search_path TO 'public';
ALTER FUNCTION public.get_available_appointment_slots(date, date) SET search_path TO 'public';
ALTER FUNCTION public.book_appointment_slot(date, time) SET search_path TO 'public';
ALTER FUNCTION public.get_rpo_analytics() SET search_path TO 'public';
ALTER FUNCTION public.get_gm_orders_by_delivery_timeline(date, date) SET search_path TO 'public';
ALTER FUNCTION public.get_gm_global_status_summary() SET search_path TO 'public';
ALTER FUNCTION public.get_inventory_status_summary() SET search_path TO 'public';
ALTER FUNCTION public.merge_duplicate_leads_by_phone() SET search_path TO 'public';
ALTER FUNCTION public.fix_failed_upload_insertion(uuid) SET search_path TO 'public';
ALTER FUNCTION public.clean_vehicle_interest_data() SET search_path TO 'public';
ALTER FUNCTION public.add_phone_number_constraints() SET search_path TO 'public';

-- Fix automation and AI functions
ALTER FUNCTION public.update_daily_learning_metrics() SET search_path TO 'public';
ALTER FUNCTION public.update_lead_engagement_metrics(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_inventory_velocity_tracking() SET search_path TO 'public';
ALTER FUNCTION public.calculate_lead_temperature(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_daily_kpis(date) SET search_path TO 'public';

-- Fix profile and user management functions
ALTER FUNCTION public.initialize_user_notification_preferences() SET search_path TO 'public';
ALTER FUNCTION public.initialize_user_for_csv(uuid, text, text, text) SET search_path TO 'public';
ALTER FUNCTION public.initialize_user_for_csv_clean(uuid, text, text, text) SET search_path TO 'public';

-- Fix call and transcription functions
ALTER FUNCTION public.trigger_call_ai_analysis() SET search_path TO 'public';
ALTER FUNCTION public.generate_call_insights_from_analysis() SET search_path TO 'public';

-- Fix security and audit functions
ALTER FUNCTION public.log_security_event(text, text, text, jsonb) SET search_path TO 'public';

-- Fix AI strategy and lead management functions
ALTER FUNCTION public.calculate_ai_strategy_for_lead(uuid, text, text, text) SET search_path TO 'public';
ALTER FUNCTION public.trigger_calculate_ai_strategy() SET search_path TO 'public';

-- Fix notification and template functions
ALTER FUNCTION public.notify_ai_insights() SET search_path TO 'public';
ALTER FUNCTION public.update_template_performance() SET search_path TO 'public';

-- Verify function security hardening
SELECT 
  p.proname as function_name,
  n.nspname as schema_name,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  CASE 
    WHEN pg_get_function_identity_arguments(p.oid) = '' THEN p.proname || '()'
    ELSE p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
  END as function_signature,
  COALESCE(p.proconfig, ARRAY[]::text[]) as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'has_role', 'user_has_manager_access', 'user_is_authenticated_simple',
    'get_dealership_context', 'generate_booking_token', 'get_available_appointment_slots',
    'book_appointment_slot', 'get_rpo_analytics', 'get_gm_orders_by_delivery_timeline',
    'get_gm_global_status_summary', 'get_inventory_status_summary', 'merge_duplicate_leads_by_phone',
    'fix_failed_upload_insertion', 'clean_vehicle_interest_data', 'add_phone_number_constraints',
    'update_daily_learning_metrics', 'update_lead_engagement_metrics', 'update_inventory_velocity_tracking',
    'calculate_lead_temperature', 'update_daily_kpis', 'initialize_user_notification_preferences',
    'initialize_user_for_csv', 'initialize_user_for_csv_clean', 'trigger_call_ai_analysis',
    'generate_call_insights_from_analysis', 'log_security_event', 'calculate_ai_strategy_for_lead',
    'trigger_calculate_ai_strategy', 'notify_ai_insights', 'update_template_performance'
  )
ORDER BY p.proname;