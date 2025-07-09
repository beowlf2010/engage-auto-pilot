-- Add enhanced AI scheduling fields to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS detailed_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS photos_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS service_done BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS next_ai_send_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_send_window_start TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS ai_send_window_end TIME DEFAULT '19:00:00',
ADD COLUMN IF NOT EXISTS preferred_contact_days INTEGER[] DEFAULT '{1,2,3,4,5}',
ADD COLUMN IF NOT EXISTS last_engagement_score NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS message_cadence_preference TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT -6;

-- Create AI message scheduling table
CREATE TABLE IF NOT EXISTS public.ai_message_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('new_lead', 'followup', 'service', 'post_sale')),
  sequence_day INTEGER NOT NULL,
  tone_variant TEXT NOT NULL CHECK (tone_variant IN ('friendly', 'urgent', 'budget')),
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email')),
  template_content TEXT NOT NULL,
  scheduled_send_at TIMESTAMP WITH TIME ZONE,
  actual_sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
  randomization_window INTEGER DEFAULT 120,
  engagement_prediction NUMERIC DEFAULT 0.0,
  a_b_test_variant TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_message_schedule_lead_id ON public.ai_message_schedule(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_message_schedule_scheduled_send ON public.ai_message_schedule(scheduled_send_at);
CREATE INDEX IF NOT EXISTS idx_ai_message_schedule_status ON public.ai_message_schedule(status);
CREATE INDEX IF NOT EXISTS idx_leads_next_ai_send ON public.leads(next_ai_send_at) WHERE next_ai_send_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score);

-- Enable RLS on new table
ALTER TABLE public.ai_message_schedule ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_message_schedule
CREATE POLICY "Managers can manage ai_message_schedule" 
ON public.ai_message_schedule 
FOR ALL 
TO authenticated 
USING (user_has_manager_access())
WITH CHECK (user_has_manager_access());

-- Create function to calculate next send time with randomization
CREATE OR REPLACE FUNCTION public.calculate_next_ai_send_time(
  p_lead_id UUID,
  p_sequence_day INTEGER,
  p_base_interval_hours INTEGER DEFAULT 24
) RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead_timezone INTEGER;
  v_send_window_start TIME;
  v_send_window_end TIME;
  v_preferred_days INTEGER[];
  v_next_send TIMESTAMP WITH TIME ZONE;
  v_random_offset NUMERIC;
BEGIN
  -- Get lead preferences
  SELECT timezone_offset, ai_send_window_start, ai_send_window_end, preferred_contact_days
  INTO v_lead_timezone, v_send_window_start, v_send_window_end, v_preferred_days
  FROM public.leads
  WHERE id = p_lead_id;
  
  -- Calculate base next send time
  v_next_send := now() + (p_base_interval_hours || ' hours')::INTERVAL;
  
  -- Add randomization (±2 hours with gaussian distribution)
  v_random_offset := (random() - 0.5) * 4; -- -2 to +2 hours
  v_next_send := v_next_send + (v_random_offset || ' hours')::INTERVAL;
  
  -- Ensure within business hours
  WHILE EXTRACT(HOUR FROM v_next_send) < EXTRACT(HOUR FROM v_send_window_start) 
        OR EXTRACT(HOUR FROM v_next_send) > EXTRACT(HOUR FROM v_send_window_end)
        OR NOT (EXTRACT(DOW FROM v_next_send)::INTEGER = ANY(v_preferred_days)) LOOP
    
    -- Move to next preferred day in business hours
    v_next_send := v_next_send + '1 day'::INTERVAL;
    v_next_send := date_trunc('day', v_next_send) + v_send_window_start;
  END LOOP;
  
  RETURN v_next_send;
END;
$$;

-- Create function to update lead score based on engagement
CREATE OR REPLACE FUNCTION public.update_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := 0;
BEGIN
  -- Base score from lead characteristics
  IF NEW.source ILIKE '%autotrader%' OR NEW.source ILIKE '%cars.com%' THEN
    v_score := v_score + 10; -- High-intent sources
  END IF;
  
  IF NEW.ai_opt_in = true THEN
    v_score := v_score + 15; -- Opted in to AI
  END IF;
  
  IF NEW.vehicle_interest IS NOT NULL AND LENGTH(NEW.vehicle_interest) > 10 THEN
    v_score := v_score + 5; -- Specific vehicle interest
  END IF;
  
  -- Engagement-based scoring
  IF NEW.last_reply_at IS NOT NULL THEN
    -- Recent response boost
    IF NEW.last_reply_at > now() - INTERVAL '24 hours' THEN
      v_score := v_score + 20;
    ELSIF NEW.last_reply_at > now() - INTERVAL '7 days' THEN
      v_score := v_score + 10;
    END IF;
  END IF;
  
  -- Cap at 100
  NEW.lead_score := LEAST(v_score, 100);
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic lead scoring
DROP TRIGGER IF EXISTS update_lead_score_trigger ON public.leads;
CREATE TRIGGER update_lead_score_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score();

-- Create function to auto-schedule next AI message
CREATE OR REPLACE FUNCTION public.schedule_next_ai_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_send TIMESTAMP WITH TIME ZONE;
  v_sequence_day INTEGER;
  v_template TEXT;
BEGIN
  -- Only process if AI is active and message was sent
  IF NEW.status = 'sent' AND OLD.status = 'scheduled' THEN
    
    -- Get current sequence day
    v_sequence_day := NEW.sequence_day + 1;
    
    -- Calculate next send time based on sequence
    CASE NEW.sequence_type
      WHEN 'new_lead' THEN
        v_next_send := public.calculate_next_ai_send_time(NEW.lead_id, v_sequence_day, 
          CASE v_sequence_day
            WHEN 1 THEN 24
            WHEN 2 THEN 48  
            WHEN 3 THEN 96
            ELSE 168 -- Weekly after day 3
          END
        );
      WHEN 'followup' THEN
        v_next_send := public.calculate_next_ai_send_time(NEW.lead_id, v_sequence_day, 72);
      WHEN 'service' THEN  
        v_next_send := public.calculate_next_ai_send_time(NEW.lead_id, v_sequence_day, 168);
      ELSE
        v_next_send := public.calculate_next_ai_send_time(NEW.lead_id, v_sequence_day, 24);
    END CASE;
    
    -- Check if sequence should continue (max days reached)
    IF (NEW.sequence_type = 'new_lead' AND v_sequence_day < 10) OR
       (NEW.sequence_type = 'followup' AND v_sequence_day < 6) OR
       (NEW.sequence_type = 'service' AND v_sequence_day < 4) OR
       (NEW.sequence_type = 'post_sale' AND v_sequence_day < 12) THEN
      
      -- Schedule next message
      INSERT INTO public.ai_message_schedule (
        lead_id,
        sequence_type,
        sequence_day,
        tone_variant,
        message_type,
        template_content,
        scheduled_send_at,
        status
      ) VALUES (
        NEW.lead_id,
        NEW.sequence_type,
        v_sequence_day,
        NEW.tone_variant,
        NEW.message_type,
        'Template for day ' || v_sequence_day || ' - ' || NEW.sequence_type,
        v_next_send,
        'scheduled'
      );
      
      -- Update lead next send time
      UPDATE public.leads 
      SET next_ai_send_at = v_next_send,
          ai_strategy_last_updated = now()
      WHERE id = NEW.lead_id;
      
    ELSE
      -- Sequence complete
      UPDATE public.leads
      SET ai_stage = 'completed',
          next_ai_send_at = NULL,
          ai_strategy_last_updated = now()
      WHERE id = NEW.lead_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-scheduling
CREATE TRIGGER schedule_next_ai_message_trigger
  AFTER UPDATE ON public.ai_message_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_next_ai_message();

-- Create view for AI dashboard metrics
CREATE OR REPLACE VIEW public.ai_dashboard_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE ai_opt_in = true AND ai_stage = 'active') as active_ai_leads,
  COUNT(*) FILTER (WHERE next_ai_send_at IS NOT NULL AND next_ai_send_at < now()) as overdue_sends,
  COUNT(*) FILTER (WHERE next_ai_send_at IS NOT NULL AND next_ai_send_at::date = CURRENT_DATE) as today_scheduled,
  ROUND(AVG(lead_score), 1) as avg_lead_score,
  COUNT(*) FILTER (WHERE last_reply_at > now() - INTERVAL '7 days') as recent_responses,
  COUNT(*) FILTER (WHERE ai_stage = 'paused') as paused_leads
FROM public.leads;

-- Grant permissions
GRANT SELECT ON public.ai_dashboard_metrics TO authenticated;
GRANT ALL ON public.ai_message_schedule TO authenticated;