
-- Add new AI control fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_contact_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_replies_enabled boolean DEFAULT false;

-- Set existing ai_opt_in leads to have contact enabled (backward compatibility)
UPDATE public.leads 
SET ai_contact_enabled = true 
WHERE ai_opt_in = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_ai_contact_enabled ON public.leads(ai_contact_enabled);
CREATE INDEX IF NOT EXISTS idx_leads_ai_replies_enabled ON public.leads(ai_replies_enabled);

-- Add constraint comments for clarity
COMMENT ON COLUMN public.leads.ai_contact_enabled IS 'Allows AI to send initial/proactive contact messages';
COMMENT ON COLUMN public.leads.ai_replies_enabled IS 'Allows AI to automatically respond to incoming customer messages';
