
-- Create table to track all vehicles mentioned in conversations
CREATE TABLE public.lead_vehicle_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  mentioned_vehicle TEXT NOT NULL,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  context_type TEXT NOT NULL DEFAULT 'inquiry' CHECK (context_type IN ('inquiry', 'showed_inventory', 'suggested_alternative', 'no_inventory')),
  ai_response_notes TEXT,
  inventory_available BOOLEAN DEFAULT false,
  mentioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI conversation notes
CREATE TABLE public.ai_conversation_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL DEFAULT 'inventory_discussion' CHECK (note_type IN ('inventory_discussion', 'vehicle_shown', 'alternative_suggested', 'follow_up_scheduled')),
  note_content TEXT NOT NULL,
  vehicles_discussed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_lead_vehicle_mentions_lead_id ON public.lead_vehicle_mentions(lead_id);
CREATE INDEX idx_lead_vehicle_mentions_mentioned_at ON public.lead_vehicle_mentions(mentioned_at DESC);
CREATE INDEX idx_ai_conversation_notes_lead_id ON public.ai_conversation_notes(lead_id);
CREATE INDEX idx_ai_conversation_notes_created_at ON public.ai_conversation_notes(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_vehicle_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all operations on lead_vehicle_mentions" ON public.lead_vehicle_mentions FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_conversation_notes" ON public.ai_conversation_notes FOR ALL USING (true);
