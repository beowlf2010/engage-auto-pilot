-- Create AI message performance tracking tables
CREATE TABLE public.ai_message_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_id UUID,
  template_stage TEXT NOT NULL,
  template_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_hour INTEGER NOT NULL,
  sent_day_of_week INTEGER NOT NULL, -- 0=Sunday, 6=Saturday
  response_received BOOLEAN DEFAULT false,
  response_time_hours NUMERIC,
  responded_at TIMESTAMP WITH TIME ZONE,
  message_effectiveness_score NUMERIC DEFAULT 0.0,
  jitter_applied_minutes INTEGER DEFAULT 0,
  original_scheduled_time TIMESTAMP WITH TIME ZONE,
  actual_sent_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI timing analytics table
CREATE TABLE public.ai_timing_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_stage TEXT NOT NULL,
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_responses INTEGER NOT NULL DEFAULT 0,
  response_rate NUMERIC NOT NULL DEFAULT 0.0,
  avg_response_time_hours NUMERIC DEFAULT 0.0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_stage, hour_of_day, day_of_week)
);

-- Create optimal timing recommendations table
CREATE TABLE public.ai_optimal_timing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_stage TEXT NOT NULL UNIQUE,
  recommended_hour INTEGER NOT NULL,
  recommended_day_offset_hours INTEGER NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  last_analysis TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_message_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_timing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_optimal_timing ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view performance for their leads" 
ON public.ai_message_performance 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = ai_message_performance.lead_id 
    AND (l.salesperson_id = auth.uid() OR public.user_has_manager_access())
  )
);

CREATE POLICY "System can manage performance data" 
ON public.ai_message_performance 
FOR ALL 
USING (public.user_has_manager_access());

CREATE POLICY "Managers can view timing analytics" 
ON public.ai_timing_analytics 
FOR ALL 
USING (public.user_has_manager_access());

CREATE POLICY "Managers can view optimal timing" 
ON public.ai_optimal_timing 
FOR ALL 
USING (public.user_has_manager_access());

-- Create indexes for performance
CREATE INDEX idx_ai_message_performance_lead_id ON public.ai_message_performance(lead_id);
CREATE INDEX idx_ai_message_performance_sent_at ON public.ai_message_performance(sent_at);
CREATE INDEX idx_ai_message_performance_stage_timing ON public.ai_message_performance(template_stage, sent_hour, sent_day_of_week);
CREATE INDEX idx_ai_timing_analytics_lookup ON public.ai_timing_analytics(template_stage, hour_of_day, day_of_week);

-- Insert initial optimal timing data (aggressive cadence)
INSERT INTO public.ai_optimal_timing (template_stage, recommended_hour, recommended_day_offset_hours, confidence_score, sample_size) VALUES
('initial', 10, 0, 0.8, 100),
('follow_up_1', 14, 7, 0.7, 80), 
('follow_up_2', 11, 18, 0.6, 60),
('follow_up_3', 15, 34, 0.5, 40),
('follow_up_4', 13, 46, 0.4, 30),
('follow_up_5', 16, 72, 0.3, 20),
('follow_up_6', 12, 96, 0.3, 15),
('follow_up_7', 14, 120, 0.2, 10);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_message_performance_updated_at
  BEFORE UPDATE ON public.ai_message_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_optimal_timing_updated_at  
  BEFORE UPDATE ON public.ai_optimal_timing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();