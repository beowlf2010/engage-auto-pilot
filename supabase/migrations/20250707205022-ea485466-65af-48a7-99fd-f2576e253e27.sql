-- Create auto_dial_queue table for managing sequential dialing
CREATE TABLE IF NOT EXISTS public.auto_dial_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'calling', 'completed', 'failed', 'paused')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_outcome TEXT,
  do_not_call_until TIMESTAMP WITH TIME ZONE,
  campaign_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_logs table for tracking all call attempts
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  phone_number TEXT NOT NULL,
  call_direction TEXT NOT NULL DEFAULT 'outbound' CHECK (call_direction IN ('inbound', 'outbound')),
  call_status TEXT NOT NULL,
  call_outcome TEXT,
  twilio_call_id TEXT,
  duration_seconds INTEGER,
  call_cost NUMERIC(10,4),
  voicemail_detected BOOLEAN DEFAULT false,
  voicemail_dropped BOOLEAN DEFAULT false,
  voicemail_url TEXT,
  recording_url TEXT,
  campaign_id UUID,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voicemail_templates table for managing voicemail scripts
CREATE TABLE IF NOT EXISTS public.voicemail_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  script_content TEXT NOT NULL,
  audio_url TEXT,
  is_default BOOLEAN DEFAULT false,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create auto_dial_sessions table for tracking bulk dialing sessions
CREATE TABLE IF NOT EXISTS public.auto_dial_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  total_leads INTEGER NOT NULL DEFAULT 0,
  completed_calls INTEGER NOT NULL DEFAULT 0,
  successful_connects INTEGER NOT NULL DEFAULT 0,
  voicemails_dropped INTEGER NOT NULL DEFAULT 0,
  current_lead_id UUID,
  call_pacing_seconds INTEGER NOT NULL DEFAULT 30,
  started_by UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.auto_dial_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voicemail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dial_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for auto_dial_queue
CREATE POLICY "Users can view auto dial queue" ON public.auto_dial_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage auto dial queue" ON public.auto_dial_queue
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Policies for call_logs
CREATE POLICY "Users can view call logs" ON public.call_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert call logs" ON public.call_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update call logs" ON public.call_logs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policies for voicemail_templates
CREATE POLICY "Users can view voicemail templates" ON public.voicemail_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage voicemail templates" ON public.voicemail_templates
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Policies for auto_dial_sessions
CREATE POLICY "Users can view auto dial sessions" ON public.auto_dial_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage auto dial sessions" ON public.auto_dial_sessions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert default voicemail templates
INSERT INTO public.voicemail_templates (template_name, script_content, attempt_number, is_default) VALUES
('First Attempt', 'Hi {first_name}, this is {salesperson_name} from {dealership_name}. I have some great news about the {vehicle_interest} you inquired about. Please give me a call back at {phone_number} so we can discuss the details. Thanks!', 1, true),
('Second Attempt', 'Hi {first_name}, this is {salesperson_name} again from {dealership_name}. I called earlier about the {vehicle_interest} you were interested in. I have some time-sensitive information that could save you money. Please call me back at {phone_number} at your earliest convenience.', 2, true),
('Final Attempt', 'Hi {first_name}, this is {salesperson_name} from {dealership_name}. This is my final attempt to reach you about the {vehicle_interest}. We have a special opportunity that expires soon. If you''re still interested, please call me back at {phone_number}. Thank you.', 3, true);

-- Create indexes for performance
CREATE INDEX idx_auto_dial_queue_status ON public.auto_dial_queue(status);
CREATE INDEX idx_auto_dial_queue_priority ON public.auto_dial_queue(priority);
CREATE INDEX idx_auto_dial_queue_lead_id ON public.auto_dial_queue(lead_id);
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_twilio_call_id ON public.call_logs(twilio_call_id);
CREATE INDEX idx_auto_dial_sessions_status ON public.auto_dial_sessions(status);