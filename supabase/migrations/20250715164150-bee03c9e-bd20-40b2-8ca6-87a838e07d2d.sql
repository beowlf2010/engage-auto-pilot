-- Create system health monitoring tables
CREATE TABLE IF NOT EXISTS public.system_health_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  health_score integer NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}',
  trends jsonb DEFAULT '{}',
  alerts_triggered integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create system alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create configuration validations table
CREATE TABLE IF NOT EXISTS public.configuration_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_type text NOT NULL,
  status text NOT NULL,
  issues jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  validated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_validations ENABLE ROW LEVEL SECURITY;

-- Create policies for managers
CREATE POLICY "Managers can manage system health history"
ON public.system_health_history
FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
));

CREATE POLICY "Managers can manage system alerts"
ON public.system_alerts
FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
));

CREATE POLICY "Managers can manage configuration validations"
ON public.configuration_validations
FOR ALL
USING (auth.uid() IN (
  SELECT user_id FROM user_roles 
  WHERE role IN ('admin', 'manager')
));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON public.system_health_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_alerts_triggered ON public.system_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON public.system_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_config_validations_validated ON public.configuration_validations(validated_at);