-- Secure response_suggestions: remove public policy and add strict RLS

-- Drop overly-permissive policy if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='response_suggestions' 
      AND policyname='Allow all operations on response_suggestions'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations on response_suggestions" ON public.response_suggestions';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.response_suggestions ENABLE ROW LEVEL SECURITY;

-- Managers can manage everything
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='response_suggestions' 
      AND policyname='Managers can manage response_suggestions'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers can manage response_suggestions" '
         || 'ON public.response_suggestions '
         || 'FOR ALL '
         || 'USING (public.user_has_manager_access()) '
         || 'WITH CHECK (public.user_has_manager_access())';
  END IF;
END $$;

-- Users can read suggestions for their own leads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='response_suggestions' 
      AND policyname='Users can view response_suggestions for their leads'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view response_suggestions for their leads" '
         || 'ON public.response_suggestions '
         || 'FOR SELECT '
         || 'USING (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = response_suggestions.lead_id '
         || 'AND (l.salesperson_id = auth.uid() OR public.user_has_manager_access())))';
  END IF;
END $$;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_response_suggestions_lead_id ON public.response_suggestions(lead_id);