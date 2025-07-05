-- Create call queue table for managing calling operations
CREATE TABLE IF NOT EXISTS public.call_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'cell',
  priority_score NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'calling', 'completed', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_attempt_at TIMESTAMP WITH TIME ZONE,
  compliance_status TEXT NOT NULL DEFAULT 'unknown' CHECK (compliance_status IN ('allowed', 'blocked', 'scheduled', 'unknown')),
  compliance_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call outcomes table for tracking call results
CREATE TABLE IF NOT EXISTS public.call_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_queue_id UUID REFERENCES public.call_queue(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'voicemail', 'busy', 'no_answer', 'disconnected', 'appointment_scheduled', 'callback_requested', 'not_interested', 'wrong_number')),
  duration_seconds INTEGER,
  notes TEXT,
  next_action TEXT,
  callback_scheduled_at TIMESTAMP WITH TIME ZONE,
  appointment_scheduled BOOLEAN DEFAULT false,
  call_recording_url TEXT,
  twilio_call_sid TEXT,
  call_cost NUMERIC(10,4),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call history table for comprehensive call tracking
CREATE TABLE IF NOT EXISTS public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  phone_type TEXT NOT NULL DEFAULT 'cell',
  call_direction TEXT NOT NULL DEFAULT 'outbound' CHECK (call_direction IN ('inbound', 'outbound')),
  call_status TEXT NOT NULL CHECK (call_status IN ('initiated', 'ringing', 'answered', 'completed', 'failed', 'no_answer', 'busy')),
  outcome TEXT CHECK (outcome IN ('answered', 'voicemail', 'busy', 'no_answer', 'disconnected', 'appointment_scheduled', 'callback_requested', 'not_interested', 'wrong_number')),
  duration_seconds INTEGER,
  call_cost NUMERIC(10,4),
  twilio_call_sid TEXT UNIQUE,
  call_recording_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add lead_temperature field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_temperature INTEGER DEFAULT 50 CHECK (lead_temperature >= 0 AND lead_temperature <= 100),
ADD COLUMN IF NOT EXISTS temperature_last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS call_priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_call_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_call_scheduled TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ai_sequence_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_pause_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_queue_lead_id ON public.call_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_queue_status ON public.call_queue(status);
CREATE INDEX IF NOT EXISTS idx_call_queue_priority_score ON public.call_queue(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_call_queue_scheduled_at ON public.call_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_lead_id ON public.call_outcomes(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_outcomes_outcome ON public.call_outcomes(outcome);
CREATE INDEX IF NOT EXISTS idx_call_history_lead_id ON public.call_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_history_twilio_sid ON public.call_history(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON public.leads(lead_temperature DESC);
CREATE INDEX IF NOT EXISTS idx_leads_call_priority ON public.leads(call_priority DESC);

-- Enable RLS on the new tables
ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_queue
CREATE POLICY "Users can view call queue entries" ON public.call_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert call queue entries" ON public.call_queue
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update call queue entries" ON public.call_queue
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create RLS policies for call_outcomes
CREATE POLICY "Users can view call outcomes" ON public.call_outcomes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert call outcomes" ON public.call_outcomes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for call_history
CREATE POLICY "Users can view call history" ON public.call_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert call history" ON public.call_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update call history" ON public.call_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create function to update call queue timestamps
CREATE OR REPLACE FUNCTION public.update_call_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for call_queue updates
CREATE TRIGGER update_call_queue_updated_at
  BEFORE UPDATE ON public.call_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_queue_updated_at();

-- Create function to update call history timestamps
CREATE OR REPLACE FUNCTION public.update_call_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for call_history updates
CREATE TRIGGER update_call_history_updated_at
  BEFORE UPDATE ON public.call_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_history_updated_at();