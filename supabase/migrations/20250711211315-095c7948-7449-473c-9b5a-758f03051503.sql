-- Create a table to track AI automation runs
CREATE TABLE IF NOT EXISTS public.ai_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  source TEXT NOT NULL DEFAULT 'unknown',
  leads_processed INTEGER DEFAULT 0,
  leads_successful INTEGER DEFAULT 0,
  leads_failed INTEGER DEFAULT 0,
  total_queued INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_automation_runs ENABLE ROW LEVEL SECURITY;

-- Create policy for managers
CREATE POLICY "Managers can view automation runs" ON public.ai_automation_runs
FOR ALL USING (auth.uid() IN (
  SELECT user_id FROM public.user_roles 
  WHERE role IN ('admin', 'manager')
));

-- Create a function to manually trigger AI automation
CREATE OR REPLACE FUNCTION public.trigger_ai_automation_manual()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  run_id uuid;
BEGIN
  -- Insert automation run record
  INSERT INTO public.ai_automation_runs (source, status)
  VALUES ('manual_trigger', 'running')
  RETURNING id INTO run_id;
  
  -- Use pg_net to call the edge function
  SELECT net.http_post(
    url := 'https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU4ODI0NywiZXhwIjoyMDY1MTY0MjQ3fQ.DY_OZ7YEKDMIXkqc_bZQ76K6VPpGWgOoTUEfhyNYh28"}'::jsonb,
    body := '{"automated": true, "source": "manual_trigger", "priority": "high"}'::jsonb
  ) INTO result;
  
  -- Update the run record
  UPDATE public.ai_automation_runs 
  SET metadata = jsonb_build_object('http_request_id', result)
  WHERE id = run_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'run_id', run_id,
    'message', 'AI automation triggered manually',
    'http_request', result
  );
END;
$$;

-- Create a health check function
CREATE OR REPLACE FUNCTION public.check_ai_automation_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  overdue_count INTEGER;
  recent_runs INTEGER;
  last_successful_run TIMESTAMP WITH TIME ZONE;
  health_status TEXT;
  issues TEXT[] := '{}';
BEGIN
  -- Count overdue leads
  SELECT COUNT(*) INTO overdue_count
  FROM public.leads 
  WHERE ai_opt_in = true 
    AND ai_sequence_paused = false 
    AND next_ai_send_at < NOW();
  
  -- Count recent automation runs (last 2 hours)
  SELECT COUNT(*) INTO recent_runs
  FROM public.ai_automation_runs
  WHERE started_at > NOW() - INTERVAL '2 hours';
  
  -- Get last successful run
  SELECT MAX(completed_at) INTO last_successful_run
  FROM public.ai_automation_runs
  WHERE status = 'completed' AND leads_successful > 0;
  
  -- Determine health status
  IF overdue_count > 100 THEN
    issues := array_append(issues, format('High overdue count: %s leads', overdue_count));
  END IF;
  
  IF recent_runs = 0 THEN
    issues := array_append(issues, 'No automation runs in last 2 hours');
  END IF;
  
  IF last_successful_run IS NULL OR last_successful_run < NOW() - INTERVAL '1 hour' THEN
    issues := array_append(issues, 'No successful runs in last hour');
  END IF;
  
  health_status := CASE 
    WHEN array_length(issues, 1) = 0 THEN 'healthy'
    WHEN array_length(issues, 1) <= 2 THEN 'warning'
    ELSE 'critical'
  END;
  
  RETURN jsonb_build_object(
    'status', health_status,
    'overdue_leads', overdue_count,
    'recent_runs', recent_runs,
    'last_successful_run', last_successful_run,
    'issues', issues,
    'timestamp', NOW()
  );
END;
$$;