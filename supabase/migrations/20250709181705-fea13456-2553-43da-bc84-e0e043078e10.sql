-- Phase 1: Complete Database Schema & Constraint Fixes

-- Fix ai_message_templates constraints
ALTER TABLE public.ai_message_templates 
DROP CONSTRAINT IF EXISTS ai_message_templates_stage_check;

ALTER TABLE public.ai_message_templates 
ADD CONSTRAINT ai_message_templates_stage_check 
CHECK (stage IN ('initial', 'follow_up', 'nurture', 'closing', 'appointment'));

-- Fix ai_quality_scores constraints
ALTER TABLE public.ai_quality_scores 
DROP CONSTRAINT IF EXISTS ai_quality_scores_overall_score_check;

ALTER TABLE public.ai_quality_scores 
ADD CONSTRAINT ai_quality_scores_overall_score_check 
CHECK (overall_score >= 0 AND overall_score <= 1);

-- Fix ai_engagement_predictions constraints
ALTER TABLE public.ai_engagement_predictions 
DROP CONSTRAINT IF EXISTS ai_engagement_predictions_confidence_check;

ALTER TABLE public.ai_engagement_predictions 
ADD CONSTRAINT ai_engagement_predictions_confidence_check 
CHECK (confidence_level >= 0 AND confidence_level <= 1);

ALTER TABLE public.ai_engagement_predictions 
DROP CONSTRAINT IF EXISTS ai_engagement_predictions_risk_check;

ALTER TABLE public.ai_engagement_predictions 
ADD CONSTRAINT ai_engagement_predictions_risk_check 
CHECK (risk_score >= 0 AND risk_score <= 1);

-- Fix ai_message_approval_queue constraints
ALTER TABLE public.ai_message_approval_queue 
DROP CONSTRAINT IF EXISTS ai_message_approval_queue_urgency_check;

ALTER TABLE public.ai_message_approval_queue 
ADD CONSTRAINT ai_message_approval_queue_urgency_check 
CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent'));

-- Fix ai_learning_insights constraints
ALTER TABLE public.ai_learning_insights 
DROP CONSTRAINT IF EXISTS ai_learning_insights_impact_check;

ALTER TABLE public.ai_learning_insights 
ADD CONSTRAINT ai_learning_insights_impact_check 
CHECK (impact_level IN ('low', 'medium', 'high', 'critical'));

-- Fix ai_prompt_evolution constraints
ALTER TABLE public.ai_prompt_evolution 
DROP CONSTRAINT IF EXISTS ai_prompt_evolution_prompt_type_check;

ALTER TABLE public.ai_prompt_evolution 
ADD CONSTRAINT ai_prompt_evolution_prompt_type_check 
CHECK (prompt_type IN ('message_generation', 'quality_scoring', 'personalization', 'timing'));

-- Ensure all AI tables have proper RLS policies
ALTER TABLE public.ai_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engagement_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_evolution ENABLE ROW LEVEL SECURITY;

-- Fix RLS policies to be consistent
DROP POLICY IF EXISTS "Allow all operations on ai_message_templates" ON public.ai_message_templates;
CREATE POLICY "Users can manage message templates" 
ON public.ai_message_templates 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on ai_learning_insights" ON public.ai_learning_insights;
CREATE POLICY "Users can manage learning insights" 
ON public.ai_learning_insights 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow all operations on ai_prompt_evolution" ON public.ai_prompt_evolution;
CREATE POLICY "Users can manage prompt evolution" 
ON public.ai_prompt_evolution 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add missing database function for error handling
CREATE OR REPLACE FUNCTION public.safe_calculate_leads_count(p_vin text, p_stock_number text)
RETURNS integer
LANGUAGE plpgsql
AS $function$
DECLARE
  lead_count integer := 0;
BEGIN
  SELECT COUNT(*) INTO lead_count
  FROM public.leads
  WHERE (p_vin IS NOT NULL AND vehicle_vin = p_vin) 
     OR (p_stock_number IS NOT NULL AND vehicle_interest ILIKE '%' || p_stock_number || '%');
  
  RETURN COALESCE(lead_count, 0);
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$function$;

-- Add error handling function for automated decisions
CREATE OR REPLACE FUNCTION public.safe_get_lead_stats(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  stats jsonb := '{}';
  message_count integer := 0;
  last_activity timestamp;
BEGIN
  -- Get message count safely
  SELECT COUNT(*) INTO message_count
  FROM public.conversations
  WHERE lead_id = p_lead_id;
  
  -- Get last activity safely
  SELECT MAX(sent_at) INTO last_activity
  FROM public.conversations
  WHERE lead_id = p_lead_id;
  
  stats := jsonb_build_object(
    'messageCount', COALESCE(message_count, 0),
    'lastActivity', COALESCE(last_activity, now()),
    'hasMessages', message_count > 0
  );
  
  RETURN stats;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'messageCount', 0,
    'lastActivity', now(),
    'hasMessages', false,
    'error', SQLERRM
  );
END;
$function$;