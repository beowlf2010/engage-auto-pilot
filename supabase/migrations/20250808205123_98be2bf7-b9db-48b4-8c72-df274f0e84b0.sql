-- Enable outbound SMS by clearing emergency stop and enabling automation
-- 1) Ensure ai_emergency_settings exists and is enabled
INSERT INTO public.ai_emergency_settings (ai_disabled, disabled_at, disable_reason)
SELECT false, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.ai_emergency_settings);

UPDATE public.ai_emergency_settings
SET ai_disabled = false,
    disabled_at = NULL,
    disable_reason = NULL,
    updated_at = now();

-- 2) Ensure ai_automation_control exists and allows sending
INSERT INTO public.ai_automation_control (automation_enabled, emergency_stop, global_timeout_minutes, max_concurrent_runs)
SELECT true, false, 4, 1
WHERE NOT EXISTS (SELECT 1 FROM public.ai_automation_control);

UPDATE public.ai_automation_control
SET automation_enabled = true,
    emergency_stop = false,
    updated_at = now();

-- 3) Log the change for auditing if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'log_security_event' AND n.nspname = 'public'
  ) THEN
    PERFORM public.log_security_event(
      'ai_messaging_enabled',
      'ai_controls',
      NULL,
      jsonb_build_object('by', auth.uid(), 'timestamp', now())
    );
  END IF;
END $$;