-- Pause AI for all existing leads and clear next sends
UPDATE public.leads
SET 
  ai_opt_in = false,
  ai_sequence_paused = true,
  ai_pause_reason = 'Paused (legacy lead reset on ' || to_char(now(), 'YYYY-MM-DD') || ')',
  next_ai_send_at = NULL,
  updated_at = now()
WHERE TRUE;

-- Cancel any scheduled/queued AI messages
UPDATE public.ai_message_schedule
SET status = 'canceled', updated_at = now()
WHERE status IN ('scheduled', 'queued') OR (scheduled_send_at IS NOT NULL AND scheduled_send_at > now());

-- Optional: mark approval queue items as rejected (safety)
UPDATE public.ai_message_approval_queue
SET rejected = true, rejected_at = now(), updated_at = now(), rejection_reason = COALESCE(rejection_reason, 'Auto-rejected due to legacy lead reset')
WHERE approved = false AND sent_at IS NULL AND (approved_at IS NULL OR approved = false);

-- Log action when available
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'log_security_event' AND n.nspname = 'public'
  ) THEN
    PERFORM public.log_security_event(
      'legacy_leads_paused',
      'ai_messaging',
      NULL,
      jsonb_build_object('timestamp', now())
    );
  END IF;
END $$;