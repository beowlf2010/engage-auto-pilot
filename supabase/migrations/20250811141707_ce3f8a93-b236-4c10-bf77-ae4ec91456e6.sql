-- Secure conversation_summaries: remove permissive policy and add role/ownership RLS

-- Ensure table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='conversation_summaries'
  ) THEN
    RAISE EXCEPTION 'Table public.conversation_summaries does not exist';
  END IF;
END $$;

-- Drop overly-permissive policy if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='conversation_summaries' 
      AND policyname='Allow all operations on conversation_summaries'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations on conversation_summaries" ON public.conversation_summaries';
  END IF;
END $$;

-- Enable RLS (idempotent)
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Managers can manage everything
CREATE POLICY IF NOT EXISTS "Managers can manage conversation_summaries"
ON public.conversation_summaries
FOR ALL
USING (public.user_has_manager_access())
WITH CHECK (public.user_has_manager_access());

-- Users can view summaries for their own leads
CREATE POLICY IF NOT EXISTS "Users can view conversation_summaries for their leads"
ON public.conversation_summaries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = conversation_summaries.lead_id
      AND (
        l.salesperson_id = auth.uid() OR public.user_has_manager_access()
      )
  )
);

-- Optional: add helpful index to support joins (safe if already exists)
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_lead_id ON public.conversation_summaries(lead_id);
