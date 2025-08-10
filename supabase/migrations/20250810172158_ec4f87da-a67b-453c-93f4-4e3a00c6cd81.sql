-- Set views to SECURITY INVOKER to avoid definer-privilege leaks
-- This ensures views respect the querying user's RLS and privileges

-- ai_dashboard_metrics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v' AND n.nspname = 'public' AND c.relname = 'ai_dashboard_metrics'
  ) THEN
    EXECUTE 'ALTER VIEW public.ai_dashboard_metrics SET (security_invoker = true)';
  END IF;
END $$;

-- v_monthly_retail_summary
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v' AND n.nspname = 'public' AND c.relname = 'v_monthly_retail_summary'
  ) THEN
    EXECUTE 'ALTER VIEW public.v_monthly_retail_summary SET (security_invoker = true)';
  END IF;
END $$;

-- security_dashboard_metrics
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'v' AND n.nspname = 'public' AND c.relname = 'security_dashboard_metrics'
  ) THEN
    EXECUTE 'ALTER VIEW public.security_dashboard_metrics SET (security_invoker = true)';
  END IF;
END $$;