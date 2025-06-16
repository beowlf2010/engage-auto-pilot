
-- Create conversation summaries table
CREATE TABLE public.conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message sentiment table
CREATE TABLE public.message_sentiment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sentiment_score NUMERIC(3,2) NOT NULL DEFAULT 0.0, -- -1.0 to 1.0 range
  sentiment_label TEXT NOT NULL DEFAULT 'neutral', -- positive, negative, neutral
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.0, -- 0.0 to 1.0 range
  emotions JSONB DEFAULT '[]'::jsonb, -- array of detected emotions
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create response suggestions table
CREATE TABLE public.response_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'general', -- greeting, follow_up, pricing, etc.
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_conversation_summaries_lead_id ON public.conversation_summaries(lead_id);
CREATE INDEX idx_message_sentiment_conversation_id ON public.message_sentiment(conversation_id);
CREATE INDEX idx_response_suggestions_lead_id ON public.response_suggestions(lead_id);
CREATE INDEX idx_response_suggestions_context_type ON public.response_suggestions(context_type);

-- Enable RLS
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.response_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies (allow all for now, can be refined later)
CREATE POLICY "Allow all operations on conversation_summaries" ON public.conversation_summaries FOR ALL USING (true);
CREATE POLICY "Allow all operations on message_sentiment" ON public.message_sentiment FOR ALL USING (true);
CREATE POLICY "Allow all operations on response_suggestions" ON public.response_suggestions FOR ALL USING (true);
