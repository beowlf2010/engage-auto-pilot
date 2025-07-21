
-- Create the missing sms_suppression_list table that the SMS function is looking for
CREATE TABLE IF NOT EXISTS public.sms_suppression_list (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL UNIQUE,
  reason text NOT NULL,
  added_at timestamp with time zone DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for the suppression list
ALTER TABLE public.sms_suppression_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sms suppression list"
  ON public.sms_suppression_list
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage sms suppression list"
  ON public.sms_suppression_list
  FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('admin', 'manager')
  ));

-- Create index for faster phone number lookups
CREATE INDEX IF NOT EXISTS idx_sms_suppression_phone_number 
ON public.sms_suppression_list(phone_number);
