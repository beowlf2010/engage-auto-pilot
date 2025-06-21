
-- Phase 1 Emergency Fixes: Add missing database column and improve data quality

-- 1. Add the missing ai_enabled_at column that's causing the edge function to crash
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ai_enabled_at timestamp with time zone;

-- 2. Update existing AI-enabled leads to have a proper ai_enabled_at timestamp
UPDATE public.leads 
SET ai_enabled_at = COALESCE(created_at, now())
WHERE ai_opt_in = true AND ai_enabled_at IS NULL;

-- 3. Create an index for better performance on ai_enabled_at queries
CREATE INDEX IF NOT EXISTS idx_leads_ai_enabled_at ON public.leads(ai_enabled_at) 
WHERE ai_opt_in = true;

-- 4. Create a table for message approval queue
CREATE TABLE IF NOT EXISTS public.ai_message_approval_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  message_stage TEXT NOT NULL DEFAULT 'follow_up',
  urgency_level TEXT NOT NULL DEFAULT 'normal',
  auto_approved BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected BOOLEAN NOT NULL DEFAULT false,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  scheduled_send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create indexes for the approval queue
CREATE INDEX IF NOT EXISTS idx_ai_approval_queue_lead_id ON public.ai_message_approval_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_approval_queue_pending ON public.ai_message_approval_queue(approved, rejected, sent_at) 
WHERE approved = false AND rejected = false AND sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_approval_queue_auto_approved ON public.ai_message_approval_queue(auto_approved, scheduled_send_at) 
WHERE auto_approved = true AND sent_at IS NULL;

-- 6. Enable RLS on the approval queue
ALTER TABLE public.ai_message_approval_queue ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for the approval queue
CREATE POLICY "Users can view approval queue messages" ON public.ai_message_approval_queue
  FOR SELECT USING (true);

CREATE POLICY "System can manage approval queue messages" ON public.ai_message_approval_queue
  FOR ALL USING (true);

-- 8. Add a function to clean up corrupted vehicle interest data
CREATE OR REPLACE FUNCTION public.clean_vehicle_interest_data()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update obviously corrupted vehicle interest data
  UPDATE public.leads 
  SET vehicle_interest = 'finding the right vehicle for your needs'
  WHERE vehicle_interest ILIKE ANY (ARRAY[
    '%unknown%',
    '%not specified%',
    '%n/a%',
    '%null%',
    '%undefined%',
    '%test%',
    '%sample%',
    '%demo%',
    '%make unknown%',
    '%model unknown%',
    '%year unknown%'
  ]) 
  OR vehicle_interest IS NULL 
  OR LENGTH(TRIM(vehicle_interest)) = 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- 9. Run the cleanup function to fix existing corrupted data
SELECT public.clean_vehicle_interest_data();
