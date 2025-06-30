
-- Update AI automation settings with improved defaults for better performance
INSERT INTO public.ai_automation_settings (setting_key, setting_value, description) VALUES
('batch_size', '100'::jsonb, 'Number of leads to process per automation run (increased for better performance)'),
('max_concurrent_sends', '10'::jsonb, 'Maximum number of concurrent message sends'),
('processing_timeout_minutes', '15'::jsonb, 'Maximum time for automation run before timeout'),
('queue_health_threshold', '50'::jsonb, 'Alert threshold for queue size'),
('enable_parallel_processing', 'true'::jsonb, 'Enable parallel lead processing for better performance'),
('auto_clean_bad_data', 'true'::jsonb, 'Automatically clean leads with bad vehicle data')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = now();

-- Update existing daily message limit to be more aggressive
UPDATE public.ai_automation_settings 
SET setting_value = '8'::jsonb, 
    description = 'Maximum messages per lead per day (increased from 5 for better engagement)',
    updated_at = now()
WHERE setting_key = 'daily_message_limit_per_lead';

-- Create queue health monitoring table
CREATE TABLE IF NOT EXISTS public.ai_queue_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_overdue INTEGER NOT NULL DEFAULT 0,
  total_processing INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  avg_processing_time_ms INTEGER,
  queue_health_score INTEGER NOT NULL DEFAULT 100, -- 0-100 health score
  alerts_triggered JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_queue_health_check_time ON public.ai_queue_health(check_time);
CREATE INDEX IF NOT EXISTS idx_leads_ai_next_send_overdue ON public.leads(next_ai_send_at, ai_opt_in, ai_sequence_paused) WHERE ai_opt_in = true AND ai_sequence_paused = false;
CREATE INDEX IF NOT EXISTS idx_conversations_ai_daily_count ON public.conversations(lead_id, sent_at, ai_generated) WHERE ai_generated = true;

-- Enable RLS
ALTER TABLE public.ai_queue_health ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view queue health" ON public.ai_queue_health FOR SELECT USING (true);
CREATE POLICY "System can insert queue health" ON public.ai_queue_health FOR INSERT WITH CHECK (true);
