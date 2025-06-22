
-- Create AI emergency settings table
CREATE TABLE IF NOT EXISTS public.ai_emergency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_disabled BOOLEAN NOT NULL DEFAULT false,
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_by UUID,
  disable_reason TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for AI emergency settings
ALTER TABLE public.ai_emergency_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and modify emergency settings
CREATE POLICY "Allow authenticated users to manage AI emergency settings" 
  ON public.ai_emergency_settings 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- Update the ai_learning_outcomes table to include positive_response in enum
ALTER TABLE public.ai_learning_outcomes 
DROP CONSTRAINT IF EXISTS ai_learning_outcomes_outcome_type_check;

ALTER TABLE public.ai_learning_outcomes 
ADD CONSTRAINT ai_learning_outcomes_outcome_type_check 
CHECK (outcome_type IN ('appointment_booked', 'test_drive_scheduled', 'sale_completed', 'lead_lost', 'no_response', 'positive_response'));
