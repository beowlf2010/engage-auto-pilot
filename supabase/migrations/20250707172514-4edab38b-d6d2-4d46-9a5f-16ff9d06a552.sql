-- Create Twilio health monitoring table
CREATE TABLE public.twilio_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  api_status TEXT NOT NULL DEFAULT 'unknown',
  response_time_ms INTEGER,
  error_message TEXT,
  account_status TEXT,
  phone_number_valid BOOLEAN,
  success_rate NUMERIC DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.twilio_health_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin/manager access
CREATE POLICY "Admins and managers can view Twilio health logs"
ON public.twilio_health_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "System can insert Twilio health logs"
ON public.twilio_health_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_twilio_health_logs_timestamp ON public.twilio_health_logs(check_timestamp DESC);

-- Create Twilio monitoring settings table
CREATE TABLE public.twilio_monitoring_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitoring_enabled BOOLEAN NOT NULL DEFAULT true,
  check_interval_minutes INTEGER NOT NULL DEFAULT 15,
  failure_threshold NUMERIC NOT NULL DEFAULT 0.5,
  alert_phone_numbers TEXT[],
  alert_emails TEXT[],
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.twilio_monitoring_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin/manager access
CREATE POLICY "Admins and managers can manage Twilio monitoring settings"
ON public.twilio_monitoring_settings 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Insert default monitoring settings
INSERT INTO public.twilio_monitoring_settings (monitoring_enabled, check_interval_minutes, failure_threshold)
VALUES (true, 15, 0.5);