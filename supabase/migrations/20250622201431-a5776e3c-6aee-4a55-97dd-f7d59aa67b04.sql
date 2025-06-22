
-- Complete AI Learning Database Schema
-- Add missing tables and optimize existing ones

-- Add indexes for performance on existing tables
CREATE INDEX IF NOT EXISTS idx_ai_message_feedback_lead_created ON public.ai_message_feedback(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_outcomes_lead_outcome ON public.ai_learning_outcomes(lead_id, outcome_type);
CREATE INDEX IF NOT EXISTS idx_ai_template_performance_score ON public.ai_template_performance(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_lead_updated ON public.conversation_memory(lead_id, updated_at DESC);

-- Create lead response patterns table if not exists
CREATE TABLE IF NOT EXISTS public.lead_response_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  total_responses INTEGER NOT NULL DEFAULT 0,
  avg_response_time_hours NUMERIC,
  best_response_hours INTEGER[] DEFAULT '{}',
  response_frequency_pattern JSONB DEFAULT '{}',
  engagement_score NUMERIC DEFAULT 0.5,
  last_response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Create AI learning insights aggregation table
CREATE TABLE IF NOT EXISTS public.ai_learning_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pattern', 'optimization', 'prediction', 'performance')),
  insight_title TEXT NOT NULL,
  insight_description TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  actionable BOOLEAN NOT NULL DEFAULT false,
  implemented BOOLEAN NOT NULL DEFAULT false,
  insight_data JSONB DEFAULT '{}',
  lead_id UUID REFERENCES public.leads(id),
  applies_globally BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  last_validated_at TIMESTAMP WITH TIME ZONE
);

-- Create learning performance metrics table
CREATE TABLE IF NOT EXISTS public.ai_learning_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_interactions INTEGER NOT NULL DEFAULT 0,
  successful_interactions INTEGER NOT NULL DEFAULT 0,
  learning_events_processed INTEGER NOT NULL DEFAULT 0,
  optimization_triggers INTEGER NOT NULL DEFAULT 0,
  template_improvements INTEGER NOT NULL DEFAULT 0,
  average_confidence_score NUMERIC DEFAULT 0.0,
  response_rate_improvement NUMERIC DEFAULT 0.0,
  conversion_rate_improvement NUMERIC DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_date)
);

-- Add indexes for new tables
CREATE INDEX IF NOT EXISTS idx_lead_response_patterns_lead_id ON public.lead_response_patterns(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_learning_insights_type_confidence ON public.ai_learning_insights(insight_type, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_learning_insights_lead_actionable ON public.ai_learning_insights(lead_id, actionable);
CREATE INDEX IF NOT EXISTS idx_ai_learning_metrics_date ON public.ai_learning_metrics(metric_date DESC);

-- Function to update learning metrics daily
CREATE OR REPLACE FUNCTION update_daily_learning_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.ai_learning_metrics (
    metric_date,
    total_interactions,
    successful_interactions,
    learning_events_processed,
    optimization_triggers,
    template_improvements,
    average_confidence_score,
    response_rate_improvement
  )
  SELECT
    CURRENT_DATE,
    COUNT(DISTINCT f.id) as total_interactions,
    COUNT(DISTINCT CASE WHEN f.feedback_type = 'positive' THEN f.id END) as successful_interactions,
    COUNT(DISTINCT o.id) as learning_events_processed,
    COUNT(DISTINCT CASE WHEN o.outcome_type IN ('positive_response', 'appointment_booked') THEN o.id END) as optimization_triggers,
    COUNT(DISTINCT tp.id) as template_improvements,
    AVG(f.rating) as average_confidence_score,
    COALESCE(AVG(tp.response_rate) - LAG(AVG(tp.response_rate)) OVER (ORDER BY CURRENT_DATE), 0) as response_rate_improvement
  FROM public.ai_message_feedback f
  LEFT JOIN public.ai_learning_outcomes o ON o.lead_id = f.lead_id
  LEFT JOIN public.ai_template_performance tp ON tp.template_content = f.message_content
  WHERE f.created_at >= CURRENT_DATE
  ON CONFLICT (metric_date) 
  DO UPDATE SET
    total_interactions = EXCLUDED.total_interactions,
    successful_interactions = EXCLUDED.successful_interactions,
    learning_events_processed = EXCLUDED.learning_events_processed,
    optimization_triggers = EXCLUDED.optimization_triggers,
    template_improvements = EXCLUDED.template_improvements,
    average_confidence_score = EXCLUDED.average_confidence_score,
    response_rate_improvement = EXCLUDED.response_rate_improvement;
END;
$$;

-- Enable real-time for learning tables
ALTER TABLE public.ai_message_feedback REPLICA IDENTITY FULL;
ALTER TABLE public.ai_learning_outcomes REPLICA IDENTITY FULL;
ALTER TABLE public.ai_learning_insights REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_memory REPLICA IDENTITY FULL;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_message_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_learning_outcomes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_learning_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_memory;
