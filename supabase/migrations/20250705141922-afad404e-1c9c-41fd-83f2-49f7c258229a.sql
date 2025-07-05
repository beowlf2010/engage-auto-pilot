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

-- Auto-Dialing System Tables
CREATE TABLE public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  call_direction TEXT NOT NULL DEFAULT 'outbound', -- 'outbound', 'inbound'
  call_status TEXT NOT NULL DEFAULT 'initiated', -- 'initiated', 'ringing', 'connected', 'completed', 'busy', 'no_answer', 'failed'
  call_outcome TEXT, -- 'answered', 'voicemail', 'busy', 'no_answer', 'disconnected'
  duration_seconds INTEGER DEFAULT 0,
  twilio_call_id TEXT,
  recording_url TEXT,
  notes TEXT,
  quality_score NUMERIC DEFAULT 0.0,
  campaign_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.auto_dial_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5, -- 1 (highest) to 10 (lowest)
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_outcome TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'calling', 'completed', 'failed', 'paused'
  campaign_id UUID,
  time_zone TEXT DEFAULT 'America/New_York',
  best_call_hours JSONB DEFAULT '[9,10,11,14,15,16,17]', -- hours of day (0-23)
  do_not_call_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.call_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'completed'
  target_lead_filters JSONB DEFAULT '{}', -- criteria for leads to include
  call_script TEXT,
  max_attempts_per_lead INTEGER DEFAULT 3,
  hours_between_attempts INTEGER DEFAULT 24,
  allowed_call_hours JSONB DEFAULT '[9,10,11,14,15,16,17]',
  time_zones_allowed JSONB DEFAULT '["America/New_York"]',
  total_leads INTEGER DEFAULT 0,
  completed_calls INTEGER DEFAULT 0,
  successful_connections INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto-dialing indexes for performance
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at);
CREATE INDEX idx_call_logs_campaign_id ON public.call_logs(campaign_id);
CREATE INDEX idx_auto_dial_queue_next_attempt ON public.auto_dial_queue(next_attempt_at, status);
CREATE INDEX idx_auto_dial_queue_lead_id ON public.auto_dial_queue(lead_id);
CREATE INDEX idx_auto_dial_queue_priority ON public.auto_dial_queue(priority, status);
CREATE INDEX idx_call_campaigns_status ON public.call_campaigns(status);

-- Enable RLS on call tables
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dial_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated access to ai_template_variants" ON public.ai_template_variants FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_conversation_preferences" ON public.ai_conversation_preferences FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_personalization_rules" ON public.ai_personalization_rules FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_learning_experiments" ON public.ai_learning_experiments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_quality_scores" ON public.ai_quality_scores FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to ai_engagement_predictions" ON public.ai_engagement_predictions FOR ALL USING (auth.uid() IS NOT NULL);

-- Call system RLS policies
CREATE POLICY "Allow authenticated access to call_logs" ON public.call_logs FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to auto_dial_queue" ON public.auto_dial_queue FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated access to call_campaigns" ON public.call_campaigns FOR ALL USING (auth.uid() IS NOT NULL);

-- Auto-dialing queue management function
CREATE OR REPLACE FUNCTION public.add_lead_to_dial_queue(
  p_lead_id UUID,
  p_phone_number TEXT,
  p_priority INTEGER DEFAULT 5,
  p_campaign_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_id UUID;
  next_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate next attempt time (immediate for high priority, delayed for lower)
  IF p_priority <= 3 THEN
    next_attempt := now();
  ELSE
    next_attempt := now() + (p_priority || ' minutes')::interval;
  END IF;
  
  -- Insert into queue, handling duplicates
  INSERT INTO public.auto_dial_queue (
    lead_id, phone_number, priority, campaign_id, next_attempt_at
  )
  VALUES (
    p_lead_id, p_phone_number, p_priority, p_campaign_id, next_attempt
  )
  ON CONFLICT (lead_id, phone_number) 
  DO UPDATE SET
    priority = LEAST(auto_dial_queue.priority, p_priority),
    next_attempt_at = CASE 
      WHEN p_priority < auto_dial_queue.priority THEN next_attempt
      ELSE auto_dial_queue.next_attempt_at
    END,
    updated_at = now()
  RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$;

-- Function to get next leads to call
CREATE OR REPLACE FUNCTION public.get_next_calls_to_make(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  queue_id UUID,
  lead_id UUID,
  phone_number TEXT,
  priority INTEGER,
  attempt_count INTEGER,
  lead_name TEXT,
  lead_temperature TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    adq.id as queue_id,
    adq.lead_id,
    adq.phone_number,
    adq.priority,
    adq.attempt_count,
    COALESCE(l.first_name || ' ' || l.last_name, 'Unknown') as lead_name,
    COALESCE(l.temperature, 'warm') as lead_temperature
  FROM public.auto_dial_queue adq
  JOIN public.leads l ON l.id = adq.lead_id
  WHERE adq.status = 'queued'
    AND adq.next_attempt_at <= now()
    AND adq.attempt_count < adq.max_attempts
    AND (adq.do_not_call_until IS NULL OR adq.do_not_call_until <= now())
    AND EXTRACT(hour FROM now() AT TIME ZONE COALESCE(adq.time_zone, 'America/New_York')) = ANY(
      SELECT jsonb_array_elements_text(adq.best_call_hours)::integer
    )
  ORDER BY adq.priority ASC, adq.next_attempt_at ASC
  LIMIT p_limit;
END;
$$;