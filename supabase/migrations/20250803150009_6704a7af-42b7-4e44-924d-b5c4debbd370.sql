-- PHASE 2 FINAL: Complete remaining function search_path hardening
-- Fix all remaining functions that still need search_path set

-- Fix trigger functions
ALTER FUNCTION public.update_call_queue_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_call_history_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_compliance_suppression_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_sales_profile_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_validation_updated_at() SET search_path TO 'public';
ALTER FUNCTION public.update_lead_trade_status() SET search_path TO 'public';
ALTER FUNCTION public.handle_ai_optin() SET search_path TO 'public';
ALTER FUNCTION public.generate_profile_qr_code() SET search_path TO 'public';
ALTER FUNCTION public.update_last_reply() SET search_path TO 'public';
ALTER FUNCTION public.track_deal_profit_changes() SET search_path TO 'public';
ALTER FUNCTION public.track_learning_outcome() SET search_path TO 'public';
ALTER FUNCTION public.validate_gm_global_status() SET search_path TO 'public';
ALTER FUNCTION public.update_lead_notes_updated_at() SET search_path TO 'public';

-- Fix inventory and vehicle management functions
ALTER FUNCTION public.calculate_leads_count(text, text) SET search_path TO 'public';
ALTER FUNCTION public.update_inventory_leads_count() SET search_path TO 'public';
ALTER FUNCTION public.mark_missing_vehicles_sold(uuid) SET search_path TO 'public';
ALTER FUNCTION public.calculate_delivery_variance() SET search_path TO 'public';
ALTER FUNCTION public.classify_deal_by_stock(text) SET search_path TO 'public';
ALTER FUNCTION public.upsert_profit_snapshot(date, integer, numeric, numeric, numeric, numeric, integer, numeric, integer, numeric, uuid) SET search_path TO 'public';
ALTER FUNCTION public.upsert_expanded_profit_snapshot(date, integer, numeric, integer, numeric, integer, numeric, integer, numeric, integer, numeric, integer, numeric, numeric, numeric, numeric, uuid, numeric) SET search_path TO 'public';
ALTER FUNCTION public.upsert_vehicle_master(text, text, text, text, text, integer, text, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.detect_vehicle_duplicates(uuid) SET search_path TO 'public';
ALTER FUNCTION public.upsert_rpo_intelligence(text, text, text, text, text, numeric, text[], integer[]) SET search_path TO 'public';

-- Fix business logic functions
ALTER FUNCTION public.increment_template_usage(uuid) SET search_path TO 'public';
ALTER FUNCTION public.schedule_next_touch(uuid) SET search_path TO 'public';
ALTER FUNCTION public.ensure_user_profile(uuid, text, text, text) SET search_path TO 'public';
ALTER FUNCTION public.create_system_conversation(jsonb) SET search_path TO 'public';
ALTER FUNCTION public.ensure_manager_role(uuid) SET search_path TO 'public';
ALTER FUNCTION public.upload_csv_leads_secure(jsonb, uuid) SET search_path TO 'public';

-- PHASE 3: Enhanced security monitoring system
-- Create enhanced security logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  p_action text,
  p_resource_type text, 
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_severity text DEFAULT 'medium',
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  current_user_id uuid;
  enriched_details jsonb;
BEGIN
  -- Get current user safely
  current_user_id := auth.uid();
  
  -- Enrich details with context
  enriched_details := COALESCE(p_details, '{}')::jsonb || jsonb_build_object(
    'timestamp', now(),
    'severity', p_severity,
    'session_id', current_setting('request.jwt.claims', true)::jsonb->>'session_id',
    'user_agent', p_user_agent,
    'ip_address', p_ip_address
  );
  
  -- Log to main security audit table
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    current_user_id, p_action, p_resource_type, p_resource_id, enriched_details
  );
  
  -- For critical events, also log to separate high-priority table if it exists
  IF p_severity IN ('critical', 'high') THEN
    -- Could extend to alerting system here
    RAISE NOTICE 'CRITICAL SECURITY EVENT: % on % by user %', p_action, p_resource_type, current_user_id;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_security_event_enhanced TO authenticated;

-- Verify all functions now have proper search_path
SELECT 
  COUNT(*) as total_functions,
  COUNT(*) FILTER (WHERE 'search_path=public' = ANY(proconfig)) as secured_functions,
  COUNT(*) FILTER (WHERE 'search_path=public' != ALL(COALESCE(proconfig, ARRAY[]::text[]))) as unsecured_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f';