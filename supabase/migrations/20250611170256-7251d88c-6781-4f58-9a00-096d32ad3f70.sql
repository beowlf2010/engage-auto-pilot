
-- Update the leads table to support more status values including VIN Evolution statuses
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Add a new constraint that includes VIN Evolution status values
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('new', 'engaged', 'paused', 'closed', 'lost', 'active', 'sold', 'bad', 'pending', 'follow_up', 'contacted', 'not_interested'));

-- Add a comment to document the status values
COMMENT ON COLUMN public.leads.status IS 'Lead status: new, engaged, paused, closed, lost, active (VIN Evolution), sold (VIN Evolution), bad (VIN Evolution), pending, follow_up, contacted, not_interested';
