-- Create function to purge ALL leads and customer data from the system
CREATE OR REPLACE FUNCTION public.purge_all_leads(p_dry_run boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_allowed boolean := false;
  anon_id uuid;
  total_leads integer := 0;
  total_conversations integer := 0;
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

  -- Count current data
  SELECT COUNT(*) INTO total_leads FROM public.leads;
  SELECT COUNT(*) INTO total_conversations FROM public.conversations;

  -- Ensure anon lead exists (used to retain conversations for compliance)
  SELECT id INTO anon_id 
  FROM public.leads 
  WHERE source = 'anonymized_system'
  LIMIT 1;

  IF anon_id IS NULL THEN
    INSERT INTO public.leads (
      id, first_name, last_name, email, source, status, 
      vehicle_interest, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), 
      'Anonymous', 
      'Customer', 
      NULL, 
      'anonymized_system', 
      'archived',
      'Data purged for system reset',
      now(), 
      now()
    ) RETURNING id INTO anon_id;
    
    -- Don't count the anon lead we just created
    total_leads := total_leads - 1;
  END IF;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'success', true,
      'dry_run', true,
      'total_leads_to_delete', total_leads,
      'total_conversations_to_reassign', total_conversations,
      'anon_lead_id', anon_id,
      'message', 'DRY RUN: This would delete ' || total_leads || ' leads and reassign ' || total_conversations || ' conversations'
    );
  END IF;

  -- Get all lead IDs to delete (except the anonymous one)
  CREATE TEMP TABLE tmp_delete_leads AS
  SELECT id FROM public.leads WHERE source != 'anonymized_system';

  -- Reassign all conversations to anonymous lead for compliance
  UPDATE public.conversations 
  SET lead_id = anon_id 
  WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  GET DIAGNOSTICS convs_reassigned = ROW_COUNT;

  -- Clean up all lead-related data across ALL AI and system tables
  DELETE FROM public.phone_numbers WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_conversation_context WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_conversation_notes WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_conversation_preferences WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_generated_messages WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_inventory_matches WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_lead_scores WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_learning_insights WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_message_analytics WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_message_approval_queue WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_message_history WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_message_feedback WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_quality_scores WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_engagement_predictions WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_churn_predictions WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_notifications WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_context_learning WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_learning_outcomes WHERE lead_id IN (SELECT id FROM tmp_delete_leads);
  DELETE FROM public.ai_message_schedule WHERE lead_id IN (SELECT id FROM tmp_delete_leads);

  -- Finally delete all the leads themselves
  DELETE FROM public.leads WHERE id IN (SELECT id FROM tmp_delete_leads);
  GET DIAGNOSTICS leads_deleted = ROW_COUNT;

  -- Clean up temp table
  DROP TABLE tmp_delete_leads;

  RETURN jsonb_build_object(
    'success', true,
    'dry_run', false,
    'leads_deleted', leads_deleted,
    'conversations_reassigned', convs_reassigned,
    'anon_lead_id', anon_id,
    'message', 'PURGE COMPLETE: Deleted ' || leads_deleted || ' leads and reassigned ' || convs_reassigned || ' conversations to anonymous lead'
  );
END;
$function$;

-- Execute the purge immediately (not dry run)
SELECT public.purge_all_leads(false);