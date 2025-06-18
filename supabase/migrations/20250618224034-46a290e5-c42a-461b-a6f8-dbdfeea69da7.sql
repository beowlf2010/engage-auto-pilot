
-- Create table for storing message sentiment analysis
CREATE TABLE IF NOT EXISTS public.message_sentiment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sentiment_score NUMERIC NOT NULL DEFAULT 0.0,
  sentiment_label TEXT NOT NULL DEFAULT 'neutral',
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  emotions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_message_sentiment_conversation_id ON public.message_sentiment(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_sentiment_created_at ON public.message_sentiment(created_at);

-- Create table for training recommendations
CREATE TABLE IF NOT EXISTS public.training_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  skills_focus JSONB DEFAULT '[]'::jsonb,
  conversation_examples JSONB DEFAULT '[]'::jsonb,
  completion_status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_by TEXT NOT NULL DEFAULT 'ai_system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for training recommendations
CREATE INDEX IF NOT EXISTS idx_training_recommendations_salesperson_id ON public.training_recommendations(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_training_recommendations_status ON public.training_recommendations(completion_status);
CREATE INDEX IF NOT EXISTS idx_training_recommendations_priority ON public.training_recommendations(priority);

-- Enable RLS on new tables (only if they don't already have it)
ALTER TABLE public.message_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
DROP POLICY IF EXISTS "Allow all operations on message_sentiment" ON public.message_sentiment;
DROP POLICY IF EXISTS "Allow all operations on training_recommendations" ON public.training_recommendations;

-- Create RLS policies for message_sentiment
CREATE POLICY "Allow all operations on message_sentiment" ON public.message_sentiment FOR ALL USING (true);

-- Create RLS policies for training_recommendations
CREATE POLICY "Allow all operations on training_recommendations" ON public.training_recommendations FOR ALL USING (true);
