-- Secure conversation_summaries policies (idempotent without IF NOT EXISTS)

-- Managers policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='conversation_summaries' 
      AND policyname='Managers can manage conversation_summaries'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Managers can manage conversation_summaries"
      ON public.conversation_summaries
      FOR ALL
      USING (public.user_has_manager_access())
      WITH CHECK (public.user_has_manager_access());
    $$;
  END IF;
END $$;

-- Users select policy
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='conversation_summaries' 
      AND policyname='Users can view conversation_summaries for their leads'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view conversation_summaries for their leads"
      ON public.conversation_summaries
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.leads l
          WHERE l.id = conversation_summaries.lead_id
            AND (l.salesperson_id = auth.uid() OR public.user_has_manager_access())
        )
      );
    $$;
  END IF;
END $$;