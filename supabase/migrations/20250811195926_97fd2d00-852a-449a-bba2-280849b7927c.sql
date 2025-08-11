-- Create a secure function to globally set Do Not Contact (DNC) flags and pause AI
CREATE OR REPLACE FUNCTION public.set_global_dnc(
  p_call boolean,
  p_email boolean,
  p_mail boolean,
  p_reason text DEFAULT 'Temporary global opt-out'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_is_manager boolean := false;
  v_updated integer := 0;
BEGIN
  -- Ensure caller is authenticated
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Check role (admin or manager)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user AND role IN ('admin','manager')
  ) INTO v_is_manager;

  IF NOT v_is_manager THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin or manager role required');
  END IF;

  -- Apply global DNC and pause AI
  UPDATE public.leads
  SET 
    do_not_call = p_call,
    do_not_email = p_email,
    do_not_mail = p_mail,
    ai_opt_in = false,
    ai_sequence_paused = true,
    ai_pause_reason = COALESCE(p_reason, 'Global DNC set'),
    next_ai_send_at = NULL,
    updated_at = now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Optional: log to security audit if table exists
  BEGIN
    PERFORM public.log_security_event(
      'global_dnc_applied',
      'leads',
      NULL,
      jsonb_build_object(
        'updated', v_updated,
        'set_call', p_call,
        'set_email', p_email,
        'set_mail', p_mail,
        'reason', p_reason,
        'triggered_by', v_user,
        'timestamp', now()
      )
    );
  EXCEPTION WHEN undefined_function THEN
    -- Ignore if log_security_event is not present
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'updated', v_updated);
END;
$$;