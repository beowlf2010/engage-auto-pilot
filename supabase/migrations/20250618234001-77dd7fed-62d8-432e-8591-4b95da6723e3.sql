
-- Enhanced AI Learning System Database Schema

-- Table for collecting detailed feedback on AI messages
CREATE TABLE IF NOT EXISTS public.ai_message_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  conversation_id UUID REFERENCES public.conversations(id),
  message_content TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'neutral')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  improvement_suggestions TEXT,
  issue_category TEXT,
  regeneration_reason TEXT,
  human_takeover_triggered BOOLEAN DEFAULT false,
  response_received BOOLEAN DEFAULT false,
  response_time_hours NUMERIC,
  conversion_outcome TEXT CHECK (conversion_outcome IN ('appointment', 'test_drive', 'sale', 'no_action')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users
);

-- Table for tracking learning outcomes and correlations
CREATE TABLE IF NOT EXISTS public.ai_learning_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  message_id UUID REFERENCES public.conversations(id),
  outcome_type TEXT NOT NULL CHECK (outcome_type IN ('appointment_booked', 'test_drive_scheduled', 'sale_completed', 'lead_lost', 'no_response')),
  outcome_value NUMERIC, -- monetary value if applicable
  days_to_outcome INTEGER,
  conversation_quality_score NUMERIC,
  message_characteristics JSONB, -- store message features
  lead_characteristics JSONB, -- store lead features at time of message
  seasonal_context JSONB, -- time of year, day of week, hour
  inventory_context JSONB, -- what inventory was mentioned
  success_factors JSONB, -- what made this successful/unsuccessful
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking successful conversation patterns
CREATE TABLE IF NOT EXISTS public.successful_conversation_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,
  conversation_flow JSONB NOT NULL, -- sequence of message types/styles
  success_rate NUMERIC NOT NULL DEFAULT 0.0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  successful_outcomes INTEGER NOT NULL DEFAULT 0,
  lead_characteristics JSONB, -- which types of leads this works for
  timing_patterns JSONB, -- when this pattern works best
  inventory_types JSONB, -- which inventory types this works for
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking template performance and A/B testing
CREATE TABLE IF NOT EXISTS public.ai_template_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.ai_message_templates(id),
  template_variant TEXT NOT NULL,
  template_content TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  positive_responses INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  response_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN usage_count > 0 THEN response_count::NUMERIC / usage_count::NUMERIC ELSE 0 END
  ) STORED,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN usage_count > 0 THEN conversion_count::NUMERIC / usage_count::NUMERIC ELSE 0 END
  ) STORED,
  performance_score NUMERIC NOT NULL DEFAULT 0.0,
  lead_segment TEXT, -- which lead segment this template works for
  seasonal_performance JSONB, -- performance by time periods
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for real-time learning and adaptation
CREATE TABLE IF NOT EXISTS public.ai_context_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  context_type TEXT NOT NULL CHECK (context_type IN ('communication_style', 'response_timing', 'content_preference', 'inventory_interest')),
  learned_pattern JSONB NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  sample_size INTEGER NOT NULL DEFAULT 1,
  last_validation TIMESTAMP WITH TIME ZONE,
  effectiveness_rating NUMERIC, -- how well this learning performed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, context_type)
);

-- Table for tracking prompt evolution and optimization
CREATE TABLE IF NOT EXISTS public.ai_prompt_evolution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  original_prompt TEXT NOT NULL,
  optimized_prompt TEXT NOT NULL,
  optimization_reason TEXT,
  performance_before JSONB, -- metrics before optimization
  performance_after JSONB, -- metrics after optimization
  improvement_percentage NUMERIC,
  test_duration_days INTEGER,
  sample_size INTEGER,
  approved_for_production BOOLEAN DEFAULT false,
  rollback_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  deactivated_at TIMESTAMP WITH TIME ZONE
);

-- Table for enhanced lead communication patterns
CREATE TABLE IF NOT EXISTS public.lead_communication_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  preferred_message_length TEXT CHECK (preferred_message_length IN ('short', 'medium', 'long')),
  preferred_tone TEXT CHECK (preferred_tone IN ('formal', 'casual', 'friendly', 'direct')),
  optimal_send_times JSONB, -- array of hours when lead responds best
  content_preferences JSONB, -- what types of content get best response
  response_patterns JSONB, -- how quickly they typically respond
  engagement_triggers JSONB, -- what motivates them to respond
  avoidance_patterns JSONB, -- what to avoid with this lead
  learning_confidence NUMERIC NOT NULL DEFAULT 0.0,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Enhanced indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_lead_id ON public.ai_message_feedback(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_created_at ON public.ai_message_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_feedback_type ON public.ai_message_feedback(feedback_type);

CREATE INDEX IF NOT EXISTS idx_ai_learning_outcomes_lead_id ON public.ai_learning_outcomes(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_outcomes_outcome_type ON public.ai_learning_outcomes(outcome_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_outcomes_created_at ON public.ai_learning_outcomes(created_at);

CREATE INDEX IF NOT EXISTS idx_successful_conversation_patterns_success_rate ON public.successful_conversation_patterns(success_rate);
CREATE INDEX IF NOT EXISTS idx_ai_template_performance_performance_score ON public.ai_template_performance(performance_score);
CREATE INDEX IF NOT EXISTS idx_ai_context_learning_lead_id ON public.ai_context_learning(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_communication_patterns_lead_id ON public.lead_communication_patterns(lead_id);

-- Functions for automatic learning updates
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update template performance when conversations are created
  IF NEW.ai_generated = true THEN
    INSERT INTO public.ai_template_performance (
      template_content, 
      template_variant, 
      usage_count,
      last_used_at
    )
    VALUES (
      NEW.body,
      'default',
      1,
      NEW.sent_at
    )
    ON CONFLICT (template_content) 
    DO UPDATE SET
      usage_count = ai_template_performance.usage_count + 1,
      last_used_at = NEW.sent_at,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic template performance tracking
DROP TRIGGER IF EXISTS trigger_update_template_performance ON public.conversations;
CREATE TRIGGER trigger_update_template_performance
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_template_performance();

-- Function to automatically create learning outcomes
CREATE OR REPLACE FUNCTION track_learning_outcome()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when appointments are created
  INSERT INTO public.ai_learning_outcomes (
    lead_id,
    outcome_type,
    outcome_value,
    days_to_outcome,
    lead_characteristics,
    seasonal_context
  )
  VALUES (
    NEW.lead_id,
    'appointment_booked',
    NULL,
    EXTRACT(DAY FROM (NEW.created_at - (
      SELECT created_at FROM public.leads WHERE id = NEW.lead_id
    ))),
    jsonb_build_object(
      'vehicle_interest', (SELECT vehicle_interest FROM public.leads WHERE id = NEW.lead_id),
      'source', (SELECT source FROM public.leads WHERE id = NEW.lead_id)
    ),
    jsonb_build_object(
      'hour', EXTRACT(HOUR FROM NEW.created_at),
      'day_of_week', EXTRACT(DOW FROM NEW.created_at),
      'month', EXTRACT(MONTH FROM NEW.created_at)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for appointment tracking
DROP TRIGGER IF EXISTS trigger_track_appointment_outcome ON public.appointments;
CREATE TRIGGER trigger_track_appointment_outcome
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION track_learning_outcome();
