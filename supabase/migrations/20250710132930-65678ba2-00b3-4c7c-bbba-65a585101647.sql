-- Create inventory alerts table for real-time monitoring
CREATE TABLE public.inventory_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('low_stock', 'aging_inventory', 'price_optimization', 'lead_opportunity')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.inventory(id),
  alert_data JSONB DEFAULT '{}',
  actionable BOOLEAN DEFAULT true,
  recommended_actions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert configurations table
CREATE TABLE public.alert_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  thresholds JSONB NOT NULL DEFAULT '{}',
  notification_channels TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert automation rules table
CREATE TABLE public.alert_automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_automation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inventory_alerts
CREATE POLICY "Users can view all inventory alerts" ON public.inventory_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage inventory alerts" ON public.inventory_alerts
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Create RLS policies for alert_configurations
CREATE POLICY "Users can view alert configurations" ON public.alert_configurations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage alert configurations" ON public.alert_configurations
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Create RLS policies for alert_automation_rules
CREATE POLICY "Users can view automation rules" ON public.alert_automation_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage automation rules" ON public.alert_automation_rules
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- Create indexes for performance
CREATE INDEX idx_inventory_alerts_type ON public.inventory_alerts(type);
CREATE INDEX idx_inventory_alerts_severity ON public.inventory_alerts(severity);
CREATE INDEX idx_inventory_alerts_active ON public.inventory_alerts(is_active);
CREATE INDEX idx_inventory_alerts_vehicle ON public.inventory_alerts(vehicle_id);
CREATE INDEX idx_inventory_alerts_created_at ON public.inventory_alerts(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_alerts_updated_at
  BEFORE UPDATE ON public.inventory_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_configurations_updated_at
  BEFORE UPDATE ON public.alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_automation_rules_updated_at
  BEFORE UPDATE ON public.alert_automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default alert configurations
INSERT INTO public.alert_configurations (name, description, alert_type, conditions, thresholds) VALUES
('Low Stock Alert', 'Alert when vehicle inventory drops below threshold', 'low_stock', 
 '{"group_by": ["make", "model", "year", "condition"]}', 
 '{"threshold": 2, "critical_threshold": 0}'),

('Aging Inventory Alert', 'Alert for vehicles in inventory too long', 'aging_inventory',
 '{"status": "available"}',
 '{"days_threshold": 60, "critical_days": 120}'),

('Price Optimization Alert', 'Alert for potential pricing issues', 'price_optimization',
 '{"has_price": true, "has_msrp": true}',
 '{"max_discount_percent": 15, "min_days_for_reduction": 30}'),

('Lead Opportunity Alert', 'Alert for high-interest vehicles', 'lead_opportunity',
 '{"status": "available", "has_leads": true}',
 '{"min_leads": 3, "high_interest_leads": 5}');

-- Insert default automation rules
INSERT INTO public.alert_automation_rules (name, trigger_conditions, actions) VALUES
('Auto Price Reduction - Aging Inventory', 
 '{"alert_type": "aging_inventory", "severity": "critical", "days_threshold": 120}',
 '{"actions": [{"type": "price_reduction", "percentage": 5}, {"type": "notify_manager"}]}'),

('Auto Marketing Campaign - High Interest', 
 '{"alert_type": "lead_opportunity", "min_leads": 5}',
 '{"actions": [{"type": "create_marketing_campaign"}, {"type": "notify_sales_team"}]}'),

('Auto Reorder - Critical Low Stock', 
 '{"alert_type": "low_stock", "severity": "critical"}',
 '{"actions": [{"type": "create_reorder_request"}, {"type": "notify_inventory_manager"}]}');