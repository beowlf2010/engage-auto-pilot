
-- Remove existing ai-automation cron job
SELECT cron.unschedule('ai-automation-every-15-minutes');

-- Create enhanced AI automation schedule
-- Run every 10 minutes during peak hours (8 AM - 6 PM Central = 2 PM - 12 AM UTC)
-- Run every 20 minutes during off-peak hours for maintenance
SELECT cron.schedule(
  'enhanced-ai-automation-peak-hours',
  '*/10 14-23 * * *', -- Every 10 minutes from 2 PM to 11 PM UTC (8 AM - 5 PM Central)
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "enhanced_peak_hours", "priority": "high"}'::jsonb
    ) as request_id;
  $$
);

-- Off-peak maintenance schedule (every 30 minutes during off hours)
SELECT cron.schedule(
  'enhanced-ai-automation-off-peak',
  '*/30 0-13,24 * * *', -- Every 30 minutes from midnight to 1 PM UTC (6 PM - 7 AM Central)
  $$
  select
    net.http_post(
      url:='https://tevtajmaofvnffzcsiuu.supabase.co/functions/v1/ai-automation',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRldnRham1hb2Z2bmZmemNzaXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1ODgyNDcsImV4cCI6MjA2NTE2NDI0N30.xFuVYGXv9MGio82M8e3vqqDv7mlaaxY7U01o8zEVumg"}'::jsonb,
      body:='{"automated": true, "source": "enhanced_off_peak", "priority": "normal"}'::jsonb
    ) as request_id;
  $$
);

-- Queue health monitoring (every 5 minutes)
SELECT cron.schedule(
  'ai-queue-health-monitor',
  '*/5 * * * *', -- Every 5 minutes
  $$
  INSERT INTO public.ai_queue_health (
    total_overdue,
    total_processing,
    total_failed,
    queue_health_score
  )
  SELECT 
    COUNT(CASE WHEN next_ai_send_at < NOW() THEN 1 END) as total_overdue,
    COUNT(*) as total_processing,
    0 as total_failed, -- Will be updated by automation runs
    CASE 
      WHEN COUNT(CASE WHEN next_ai_send_at < NOW() THEN 1 END) = 0 THEN 100
      WHEN COUNT(CASE WHEN next_ai_send_at < NOW() THEN 1 END) < 20 THEN 90
      WHEN COUNT(CASE WHEN next_ai_send_at < NOW() THEN 1 END) < 50 THEN 70
      WHEN COUNT(CASE WHEN next_ai_send_at < NOW() THEN 1 END) < 100 THEN 50
      ELSE 25
    END as queue_health_score
  FROM public.leads 
  WHERE ai_opt_in = true 
    AND ai_sequence_paused = false 
    AND next_ai_send_at IS NOT NULL;
  $$
);
