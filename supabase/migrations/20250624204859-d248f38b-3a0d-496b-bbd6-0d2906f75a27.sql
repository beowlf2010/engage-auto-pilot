
-- Add is_hidden column to leads table
ALTER TABLE public.leads 
ADD COLUMN is_hidden boolean DEFAULT false;

-- Create an index for better performance when filtering hidden leads
CREATE INDEX idx_leads_is_hidden ON public.leads(is_hidden) WHERE is_hidden = true;
