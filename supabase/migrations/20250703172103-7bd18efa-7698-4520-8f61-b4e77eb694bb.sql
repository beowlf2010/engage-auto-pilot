-- Add manager assignment fields to deals table
ALTER TABLE public.deals 
ADD COLUMN manager_id uuid REFERENCES public.profiles(id),
ADD COLUMN assigned_managers jsonb DEFAULT '[]'::jsonb;

-- Create index for better performance on manager queries
CREATE INDEX IF NOT EXISTS idx_deals_manager_id ON public.deals(manager_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_managers ON public.deals USING GIN(assigned_managers);

-- Add comments for documentation
COMMENT ON COLUMN public.deals.manager_id IS 'Primary manager responsible for this deal';
COMMENT ON COLUMN public.deals.assigned_managers IS 'Array of manager IDs assigned to this deal for multi-manager scenarios';