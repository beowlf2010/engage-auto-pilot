-- Phase 1: Smart Learning Implementation Database Schema

-- Enhanced A/B testing for templates
CREATE TABLE public.ai_template_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_template_id UUID REFERENCES public.ai_template_performance(id),
  variant_name TEXT NOT NULL,
  variant_content TEXT NOT NULL,
  variant_type TEXT NOT NULL DEFAULT 'a_b_test',
  is_active BOOLEAN NOT NULL DEFAULT true,
  success_rate NUMERIC DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced conversation context tracking
CREATE TABLE public.ai_conversation_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  preference_type TEXT NOT NULL, -- 'communication_style', 'vehicle_preference', 'timing_preference'
  preference_value JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 1.0,
  learned_from TEXT, -- source of the preference learning
  last_validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dynamic response personalization rules
CREATE TABLE public.ai_personalization_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'lead_source', 'temperature', 'persona', 'timing'
  condition_criteria JSONB NOT NULL, -- conditions when this rule applies
  response_modifications JSONB NOT NULL, -- how to modify the response
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  success_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance-based learning outcomes
CREATE TABLE public.ai_learning_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL,
  experiment_type TEXT NOT NULL, -- 'template_variant', 'personalization_rule', 'timing_optimization'
  control_group_config JSONB NOT NULL,
  test_group_config JSONB NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'paused'
  sample_size INTEGER DEFAULT 0,
  control_success_rate NUMERIC DEFAULT 0.0,
  test_success_rate NUMERIC DEFAULT 0.0,
  statistical_significance NUMERIC DEFAULT 0.0,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Real-time AI quality scoring
CREATE TABLE public.ai_quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID, -- references conversations or ai_message_approval_queue
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  message_content TEXT NOT NULL,
  overall_score NUMERIC NOT NULL DEFAULT 0.0,
  personalization_score NUMERIC DEFAULT 0.0,
  relevance_score NUMERIC DEFAULT 0.0,
  tone_appropriateness_score NUMERIC DEFAULT 0.0,
  compliance_score NUMERIC DEFAULT 1.0,
  quality_factors JSONB DEFAULT '[]',
  improvement_suggestions JSONB DEFAULT '[]',
  approved_for_sending BOOLEAN DEFAULT true,
  reviewed_by_human BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Proactive engagement predictions
CREATE TABLE public.ai_engagement_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  prediction_type TEXT NOT NULL, -- 'churn_risk', 'engagement_opportunity', 'appointment_ready'
  risk_score NUMERIC NOT NULL DEFAULT 0.0,
  confidence_level NUMERIC NOT NULL DEFAULT 0.0,
  contributing_factors JSONB DEFAULT '[]',
  recommended_actions JSONB DEFAULT '[]',
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  acted_upon BOOLEAN DEFAULT false,
  outcome_tracked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX idx_ai_template_variants_base_template ON public.ai_template_variants(base_template_id);
CREATE INDEX idx_ai_conversation_preferences_lead ON public.ai_conversation_preferences(lead_id, preference_type);
CREATE INDEX idx_ai_personalization_rules_type ON public.ai_personalization_rules(rule_type, is_active);
CREATE INDEX idx_ai_learning_experiments_status ON public.ai_learning_experiments(status, start_date);
CREATE INDEX idx_ai_quality_scores_lead ON public.ai_quality_scores(lead_id, created_at);
CREATE INDEX idx_ai_engagement_predictions_lead ON public.ai_engagement_predictions(lead_id, prediction_type, prediction_date);

-- Enable RLS on new tables
ALTER TABLE public.ai_template_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_personalization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_engagement_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated access to ai_template_variants" ON public.ai_template_variants FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_conversation_preferences" ON public.ai_conversation_preferences FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_personalization_rules" ON public.ai_personalization_rules FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_learning_experiments" ON public.ai_learning_experiments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_quality_scores" ON public.ai_quality_scores FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_engagement_predictions" ON public.ai_engagement_predictions FOR ALL USING (auth.uid() IS NOT NULL);