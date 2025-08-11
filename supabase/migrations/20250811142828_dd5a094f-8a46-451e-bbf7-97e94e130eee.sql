-- Secure lead_response_patterns and lead_vehicle_mentions tables

-- Drop permissive public policies if present
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='lead_response_patterns' 
      AND policyname='Allow all operations on lead_response_patterns'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations on lead_response_patterns" ON public.lead_response_patterns';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='lead_vehicle_mentions' 
      AND policyname='Allow all operations on lead_vehicle_mentions'
  ) THEN
    EXECUTE 'DROP POLICY "Allow all operations on lead_vehicle_mentions" ON public.lead_vehicle_mentions';
  END IF;
END $$;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.lead_response_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_vehicle_mentions ENABLE ROW LEVEL SECURITY;

-- Managers can manage everything
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_response_patterns' 
    AND policyname='Managers can manage lead_response_patterns'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers can manage lead_response_patterns" '
         || 'ON public.lead_response_patterns FOR ALL '
         || 'USING (public.user_has_manager_access()) '
         || 'WITH CHECK (public.user_has_manager_access())';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_vehicle_mentions' 
    AND policyname='Managers can manage lead_vehicle_mentions'
  ) THEN
    EXECUTE 'CREATE POLICY "Managers can manage lead_vehicle_mentions" '
         || 'ON public.lead_vehicle_mentions FOR ALL '
         || 'USING (public.user_has_manager_access()) '
         || 'WITH CHECK (public.user_has_manager_access())';
  END IF;
END $$;

-- Users can view rows for their own leads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_response_patterns' 
    AND policyname='Users can view lead_response_patterns for their leads'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view lead_response_patterns for their leads" '
         || 'ON public.lead_response_patterns FOR SELECT '
         || 'USING (EXISTS (SELECT 1 FROM public.leads l '
         || 'WHERE l.id = lead_response_patterns.lead_id '
         || 'AND (l.salesperson_id = auth.uid() OR public.user_has_manager_access())))';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='lead_vehicle_mentions' 
    AND policyname='Users can view lead_vehicle_mentions for their leads'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view lead_vehicle_mentions for their leads" '
         || 'ON public.lead_vehicle_mentions FOR SELECT '
         || 'USING (EXISTS (SELECT 1 FROM public.leads l '
         || 'WHERE l.id = lead_vehicle_mentions.lead_id '
         || 'AND (l.salesperson_id = auth.uid() OR public.user_has_manager_access())))';
  END IF;
END $$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_lead_response_patterns_lead_id ON public.lead_response_patterns(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_vehicle_mentions_lead_id ON public.lead_vehicle_mentions(lead_id);