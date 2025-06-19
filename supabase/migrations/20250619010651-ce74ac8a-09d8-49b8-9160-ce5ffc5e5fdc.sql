
-- Create the customer_journeys table for journey tracking
CREATE TABLE IF NOT EXISTS public.customer_journeys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  journey_stage TEXT NOT NULL DEFAULT 'awareness',
  touchpoints JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  next_best_action TEXT DEFAULT '',
  estimated_time_to_decision INTEGER DEFAULT 30,
  conversion_probability NUMERIC DEFAULT 0.3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(lead_id)
);

-- Add the missing columns to conversation_memory table
ALTER TABLE public.conversation_memory 
ADD COLUMN IF NOT EXISTS current_session_id TEXT,
ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS customer_profile JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS behavioral_patterns JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS emotional_context JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on the new table
ALTER TABLE public.customer_journeys ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for customer_journeys
CREATE POLICY "Users can access customer journeys" ON public.customer_journeys
  FOR ALL USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_journeys_lead_id ON public.customer_journeys(lead_id);
CREATE INDEX IF NOT EXISTS idx_customer_journeys_stage ON public.customer_journeys(journey_stage);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_lead_id ON public.conversation_memory(lead_id);
