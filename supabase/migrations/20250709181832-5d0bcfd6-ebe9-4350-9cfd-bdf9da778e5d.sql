-- Phase 1: Fix existing data first, then add constraints

-- First, let's clean up existing ai_message_templates data
UPDATE public.ai_message_templates 
SET stage = 'follow_up' 
WHERE stage IS NULL OR stage NOT IN ('initial', 'follow_up', 'nurture', 'closing', 'appointment');

-- Clean up ai_quality_scores data
UPDATE public.ai_quality_scores 
SET overall_score = LEAST(GREATEST(overall_score, 0), 1) 
WHERE overall_score < 0 OR overall_score > 1;

-- Clean up ai_engagement_predictions data
UPDATE public.ai_engagement_predictions 
SET confidence_level = LEAST(GREATEST(COALESCE(confidence_level, 0), 0), 1);

UPDATE public.ai_engagement_predictions 
SET risk_score = LEAST(GREATEST(COALESCE(risk_score, 0), 0), 1);

-- Clean up ai_message_approval_queue data
UPDATE public.ai_message_approval_queue 
SET urgency_level = 'normal' 
WHERE urgency_level IS NULL OR urgency_level NOT IN ('low', 'normal', 'high', 'urgent');

-- Clean up ai_learning_insights data
UPDATE public.ai_learning_insights 
SET impact_level = 'medium' 
WHERE impact_level IS NULL OR impact_level NOT IN ('low', 'medium', 'high', 'critical');

-- Clean up ai_prompt_evolution data
UPDATE public.ai_prompt_evolution 
SET prompt_type = 'message_generation' 
WHERE prompt_type IS NULL OR prompt_type NOT IN ('message_generation', 'quality_scoring', 'personalization', 'timing');

-- Now add the constraints after data is clean
ALTER TABLE public.ai_message_templates 
DROP CONSTRAINT IF EXISTS ai_message_templates_stage_check;

ALTER TABLE public.ai_message_templates 
ADD CONSTRAINT ai_message_templates_stage_check 
CHECK (stage IN ('initial', 'follow_up', 'nurture', 'closing', 'appointment'));

-- Add other constraints
ALTER TABLE public.ai_quality_scores 
DROP CONSTRAINT IF EXISTS ai_quality_scores_overall_score_check;

ALTER TABLE public.ai_quality_scores 
ADD CONSTRAINT ai_quality_scores_overall_score_check 
CHECK (overall_score >= 0 AND overall_score <= 1);

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

ALTER TABLE public.ai_message_approval_queue 
DROP CONSTRAINT IF EXISTS ai_message_approval_queue_urgency_check;

ALTER TABLE public.ai_message_approval_queue 
ADD CONSTRAINT ai_message_approval_queue_urgency_check 
CHECK (urgency_level IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE public.ai_learning_insights 
DROP CONSTRAINT IF EXISTS ai_learning_insights_impact_check;

ALTER TABLE public.ai_learning_insights 
ADD CONSTRAINT ai_learning_insights_impact_check 
CHECK (impact_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE public.ai_prompt_evolution 
DROP CONSTRAINT IF EXISTS ai_prompt_evolution_prompt_type_check;

ALTER TABLE public.ai_prompt_evolution 
ADD CONSTRAINT ai_prompt_evolution_prompt_type_check 
CHECK (prompt_type IN ('message_generation', 'quality_scoring', 'personalization', 'timing'));