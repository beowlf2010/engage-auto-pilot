
-- Enable pg_cron and pg_net extensions if not already enabled
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Remove any existing ai-automation cron jobs to avoid duplicates
select cron.unschedule('ai-automation-every-15-minutes');

-- Schedule AI automation to run every 15 minutes during business hours (8 AM - 8 PM Central Time)
-- This runs at 8:00, 8:15, 8:30, 8:45, etc. through 7:45 PM Central (2 PM - 1:45 AM UTC)
select
  cron.schedule(
    'ai-automation-every-15-minutes',
    '0,15,30,45 14-23,0-1 * * *', -- Every 15 minutes from 2 PM UTC to 1:45 AM UTC (8 AM - 7:45 PM Central)
    $$
    select
      net.http_post(
        url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
        body:='{"automated": true, "source": "cron_job"}'::jsonb
      ) as request_id;
    $$
  );

-- Create a table to track automation runs and results
CREATE TABLE IF NOT EXISTS public.ai_automation_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  source TEXT NOT NULL DEFAULT 'manual', -- 'cron_job', 'manual', 'api'
  processed_leads INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  error_details JSONB,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add safety settings table
CREATE TABLE IF NOT EXISTS public.ai_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default safety settings
INSERT INTO public.ai_automation_settings (setting_key, setting_value, description) VALUES
('daily_message_limit_per_lead', '5'::jsonb, 'Maximum messages per lead per day'),
('business_hours_start', '8'::jsonb, 'Business hours start (Central Time)'),
('business_hours_end', '20'::jsonb, 'Business hours end (Central Time)'),
('automation_enabled', 'true'::jsonb, 'Global automation on/off switch'),
('max_concurrent_sends', '10'::jsonb, 'Maximum concurrent message sends'),
('pause_on_customer_reply', 'true'::jsonb, 'Auto-pause sequences when customers reply')
ON CONFLICT (setting_key) DO NOTHING;

-- Add RLS policies
ALTER TABLE public.ai_automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_automation_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view automation data
CREATE POLICY "Users can view automation runs" ON public.ai_automation_runs FOR SELECT USING (true);
CREATE POLICY "Users can view automation settings" ON public.ai_automation_settings FOR SELECT USING (true);
CREATE POLICY "Users can update automation settings" ON public.ai_automation_settings FOR UPDATE USING (true);
