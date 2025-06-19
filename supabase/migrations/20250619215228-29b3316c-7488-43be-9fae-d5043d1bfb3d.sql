
-- Create the aggressive_message_schedule table
CREATE TABLE public.aggressive_message_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  message_index INTEGER NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message_strategy TEXT NOT NULL,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for the aggressive_message_schedule table
ALTER TABLE public.aggressive_message_schedule ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write aggressive message schedules
CREATE POLICY "Authenticated users can manage aggressive message schedules"
  ON public.aggressive_message_schedule
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Create index for performance
CREATE INDEX idx_aggressive_schedule_lead_id ON public.aggressive_message_schedule(lead_id);
CREATE INDEX idx_aggressive_schedule_scheduled_at ON public.aggressive_message_schedule(scheduled_at);
CREATE INDEX idx_aggressive_schedule_is_sent ON public.aggressive_message_schedule(is_sent);
