
-- Create lead_behavior_triggers table
CREATE TABLE IF NOT EXISTS public.lead_behavior_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('website_visit', 'price_drop', 'new_inventory', 'abandoned_quote', 'email_open', 'call_missed')),
  trigger_data JSONB,
  trigger_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_processed BOOLEAN NOT NULL DEFAULT false,
  message_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_response_patterns table  
CREATE TABLE IF NOT EXISTS public.lead_response_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  best_response_hours INTEGER[],
  best_response_days INTEGER[],
  avg_response_time_hours NUMERIC,
  total_messages_sent INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  last_response_at TIMESTAMP WITH TIME ZONE,
  preferred_content_types TEXT[],
  inventory_responsiveness JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_behavior_triggers_lead_id ON public.lead_behavior_triggers(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_behavior_triggers_processed ON public.lead_behavior_triggers(is_processed);
CREATE INDEX IF NOT EXISTS idx_lead_behavior_triggers_time ON public.lead_behavior_triggers(trigger_time);
CREATE INDEX IF NOT EXISTS idx_lead_response_patterns_lead_id ON public.lead_response_patterns(lead_id);

-- Enable RLS
ALTER TABLE public.lead_behavior_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_response_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - can be restricted later)
CREATE POLICY "Allow all operations on lead_behavior_triggers" ON public.lead_behavior_triggers FOR ALL USING (true);
CREATE POLICY "Allow all operations on lead_response_patterns" ON public.lead_response_patterns FOR ALL USING (true);
