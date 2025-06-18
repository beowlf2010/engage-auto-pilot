
-- Add AI takeover fields to leads table
ALTER TABLE public.leads 
ADD COLUMN ai_takeover_enabled boolean DEFAULT false,
ADD COLUMN ai_takeover_delay_minutes integer DEFAULT 7,
ADD COLUMN pending_human_response boolean DEFAULT false,
ADD COLUMN human_response_deadline timestamp with time zone;

-- Create index for efficient querying of leads needing AI takeover
CREATE INDEX idx_leads_human_response_deadline ON public.leads(human_response_deadline) 
WHERE pending_human_response = true AND ai_takeover_enabled = true;
