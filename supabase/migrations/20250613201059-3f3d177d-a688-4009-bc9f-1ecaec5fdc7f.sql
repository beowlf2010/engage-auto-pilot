
-- Create table to track message uniqueness
CREATE TABLE IF NOT EXISTS public.ai_message_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  message_hash TEXT NOT NULL, -- For quick similarity checks
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  context_data JSONB, -- Store context used for generation
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI conversation context
CREATE TABLE IF NOT EXISTS public.ai_conversation_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_summary TEXT,
  key_topics TEXT[],
  lead_preferences JSONB,
  response_style TEXT,
  last_interaction_type TEXT,
  context_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_message_history_lead_id ON public.ai_message_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_history_sent_at ON public.ai_message_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_ai_message_history_hash ON public.ai_message_history(message_hash);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_context_lead_id ON public.ai_conversation_context(lead_id);

-- Enable RLS
ALTER TABLE public.ai_message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_context ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on ai_message_history" ON public.ai_message_history FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_conversation_context" ON public.ai_conversation_context FOR ALL USING (true);
