
-- Add message intensity field to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS message_intensity text DEFAULT 'gentle' CHECK (message_intensity IN ('aggressive', 'gentle'));

-- Drop the aggressive_message_schedule table since we're consolidating everything
DROP TABLE IF EXISTS public.aggressive_message_schedule;

-- Add index for performance on the new field
CREATE INDEX IF NOT EXISTS idx_leads_message_intensity ON public.leads(message_intensity);
