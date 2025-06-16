
-- Create compliance violations table
CREATE TABLE public.compliance_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL, -- tcpa, do_not_call, inappropriate_language, etc.
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  description TEXT NOT NULL,
  detected_content TEXT NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'open', -- open, resolved, false_positive
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation quality scores table
CREATE TABLE public.conversation_quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  salesperson_id UUID REFERENCES public.profiles(id),
  overall_score NUMERIC(3,2) NOT NULL DEFAULT 0.0, -- 0.0 to 10.0 scale
  response_time_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  sentiment_progression_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  professionalism_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  engagement_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  close_attempt_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  quality_factors JSONB DEFAULT '[]'::jsonb,
  improvement_areas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training recommendations table
CREATE TABLE public.training_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- technique_improvement, compliance_training, product_knowledge, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  skills_focus JSONB DEFAULT '[]'::jsonb, -- array of skill areas to focus on
  conversation_examples JSONB DEFAULT '[]'::jsonb, -- references to specific conversations
  completion_status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  due_date DATE,
  created_by TEXT DEFAULT 'ai_system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance rules configuration table
CREATE TABLE public.compliance_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL, -- keyword_detection, pattern_matching, ai_analysis
  description TEXT NOT NULL,
  detection_pattern TEXT, -- regex pattern or keywords
  severity TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  auto_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_compliance_violations_conversation_id ON public.compliance_violations(conversation_id);
CREATE INDEX idx_compliance_violations_lead_id ON public.compliance_violations(lead_id);
CREATE INDEX idx_compliance_violations_violation_type ON public.compliance_violations(violation_type);
CREATE INDEX idx_compliance_violations_severity ON public.compliance_violations(severity);
CREATE INDEX idx_compliance_violations_status ON public.compliance_violations(status);

CREATE INDEX idx_quality_scores_conversation_id ON public.conversation_quality_scores(conversation_id);
CREATE INDEX idx_quality_scores_lead_id ON public.conversation_quality_scores(lead_id);
CREATE INDEX idx_quality_scores_salesperson_id ON public.conversation_quality_scores(salesperson_id);
CREATE INDEX idx_quality_scores_overall_score ON public.conversation_quality_scores(overall_score);

CREATE INDEX idx_training_recommendations_salesperson_id ON public.training_recommendations(salesperson_id);
CREATE INDEX idx_training_recommendations_priority ON public.training_recommendations(priority);
CREATE INDEX idx_training_recommendations_status ON public.training_recommendations(completion_status);

CREATE INDEX idx_compliance_rules_rule_type ON public.compliance_rules(rule_type);
CREATE INDEX idx_compliance_rules_is_active ON public.compliance_rules(is_active);

-- Enable RLS
ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for now, can be refined later)
CREATE POLICY "Allow all operations on compliance_violations" ON public.compliance_violations FOR ALL USING (true);
CREATE POLICY "Allow all operations on conversation_quality_scores" ON public.conversation_quality_scores FOR ALL USING (true);
CREATE POLICY "Allow all operations on training_recommendations" ON public.training_recommendations FOR ALL USING (true);
CREATE POLICY "Allow all operations on compliance_rules" ON public.compliance_rules FOR ALL USING (true);

-- Insert some default compliance rules
INSERT INTO public.compliance_rules (rule_name, rule_type, description, detection_pattern, severity, auto_flag) VALUES
('TCPA Violation Keywords', 'keyword_detection', 'Detects potential TCPA violations', 'auto.?dial|robo.?call|pre.?recorded', 'high', true),
('Do Not Call Violation', 'keyword_detection', 'Detects references to DNC violations', 'do not call|dnc|stop calling', 'high', true),
('Inappropriate Language', 'ai_analysis', 'Detects unprofessional or inappropriate language', null, 'medium', true),
('Pressure Tactics', 'ai_analysis', 'Detects high-pressure sales tactics', null, 'medium', false),
('Misleading Claims', 'ai_analysis', 'Detects potentially misleading product claims', null, 'high', true);
