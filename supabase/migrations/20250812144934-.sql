-- Create purge function to clear old leads while preserving conversations
CREATE OR REPLACE FUNCTION public.purge_old_leads(
  p_cutoff timestamptz DEFAULT (now() - interval '90 days'),
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_allowed boolean := false;
  anon_id uuid;
  purged_ids uuid[];
  total integer := 0;
  convs_reassigned integer := 0;
  leads_deleted integer := 0;
BEGIN
  -- Authorization: only admins/managers can run
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user AND role IN ('admin','manager')
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin or manager role required');
  END IF;

  -- Collect candidate leads by last activity
  CREATE TEMP TABLE tmp_purge_leads ON COMMIT DROP AS
  SELECT id
  FROM public.leads
  WHERE COALESCE(last_reply_at, updated_at, created_at) < p_cutoff;

  SELECT array_agg(id) FROM tmp_purge_leads INTO purged_ids;
  total := COALESCE(array_length(purged_ids,1), 0);

  -- Ensure anon lead exists (used to retain conversations)
  SELECT id INTO anon_id 
  FROM public.leads 
  WHERE source = 'anonymized_system'
  LIMIT 1;

  IF anon_id IS NULL THEN
    INSERT INTO public.leads (
      id, first_name, last_name, email, source, status, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 'Anon', 'Lead', NULL, 'anonymized_system', 'archived', now(), now()
    ) RETURNING id INTO anon_id;
  END IF;

  IF p_dry_run THEN
    SELECT count(*) INTO convs_reassigned FROM public.conversations WHERE lead_id = ANY(purged_ids);
    SELECT count(*) INTO leads_deleted FROM tmp_purge_leads;

    RETURN jsonb_build_object(
      'success', true,
      'dry_run', true,
      'cutoff', p_cutoff,
      'lead_count', leads_deleted,
      'conversations_to_reassign', convs_reassigned,
      'anon_lead_id', anon_id
    );
  END IF;

  -- Reassign conversations to anon lead
  UPDATE public.conversations 
  SET lead_id = anon_id 
  WHERE lead_id = ANY(purged_ids);
  GET DIAGNOSTICS convs_reassigned = ROW_COUNT;

  -- Clean up dependent records across known lead-linked tables
  DELETE FROM public.phone_numbers WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_conversation_context WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_conversation_notes WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_conversation_preferences WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_generated_messages WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_inventory_matches WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_lead_scores WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_learning_insights WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_message_analytics WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_message_approval_queue WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_message_history WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_message_feedback WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_quality_scores WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_engagement_predictions WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_churn_predictions WHERE lead_id = ANY(purged_ids);
  DELETE FROM public.ai_notifications WHERE lead_id = ANY(purged_ids);

  -- Finally delete the leads themselves
  DELETE FROM public.leads WHERE id = ANY(purged_ids);
  GET DIAGNOSTICS leads_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', false,
    'cutoff', p_cutoff,
    'leads_deleted', leads_deleted,
    'conversations_reassigned', convs_reassigned,
    'anon_lead_id', anon_id
  );
END;
$$;