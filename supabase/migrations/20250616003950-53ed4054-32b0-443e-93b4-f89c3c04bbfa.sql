
-- Sales Forecasting Tables
CREATE TABLE public.sales_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_date DATE NOT NULL,
  forecast_period TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'quarterly'
  predicted_units INTEGER NOT NULL DEFAULT 0,
  predicted_revenue NUMERIC NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  forecast_factors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_conversion_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id),
  conversion_probability NUMERIC NOT NULL DEFAULT 0.0,
  predicted_close_date DATE,
  predicted_sale_amount NUMERIC,
  prediction_factors JSONB DEFAULT '[]'::jsonb,
  temperature_score INTEGER NOT NULL DEFAULT 0, -- 0-100 scale
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.pipeline_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salesperson_id UUID REFERENCES public.profiles(id),
  forecast_month DATE NOT NULL,
  predicted_closes INTEGER NOT NULL DEFAULT 0,
  predicted_revenue NUMERIC NOT NULL DEFAULT 0,
  weighted_pipeline NUMERIC NOT NULL DEFAULT 0,
  confidence_level TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory Demand Prediction Tables
CREATE TABLE public.inventory_demand_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  demand_score INTEGER NOT NULL DEFAULT 0, -- 0-100 scale
  predicted_days_to_sell INTEGER,
  seasonal_factor NUMERIC DEFAULT 1.0,
  market_demand_level TEXT NOT NULL DEFAULT 'medium',
  price_competitiveness TEXT NOT NULL DEFAULT 'market',
  prediction_accuracy NUMERIC DEFAULT 0.0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_velocity_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  body_style TEXT,
  avg_days_to_sell NUMERIC NOT NULL DEFAULT 0,
  total_sold INTEGER NOT NULL DEFAULT 0,
  current_inventory_count INTEGER NOT NULL DEFAULT 0,
  velocity_trend TEXT NOT NULL DEFAULT 'stable', -- 'increasing', 'stable', 'decreasing'
  last_sale_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Market Intelligence Tables
CREATE TABLE public.market_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_date DATE NOT NULL,
  market_segment TEXT NOT NULL, -- 'sedan', 'suv', 'truck', etc.
  demand_trend TEXT NOT NULL DEFAULT 'stable',
  price_trend TEXT NOT NULL DEFAULT 'stable',
  inventory_levels TEXT NOT NULL DEFAULT 'normal',
  competitive_pressure TEXT NOT NULL DEFAULT 'moderate',
  seasonal_factor NUMERIC DEFAULT 1.0,
  economic_indicators JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  data_sources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.competitive_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER,
  our_price NUMERIC,
  competitor_avg_price NUMERIC,
  competitor_count INTEGER DEFAULT 0,
  price_position TEXT NOT NULL DEFAULT 'market', -- 'below', 'market', 'above'
  market_share_estimate NUMERIC DEFAULT 0.0,
  competitive_advantages JSONB DEFAULT '[]'::jsonb,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Predictive Analytics Support Tables
CREATE TABLE public.prediction_model_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_type TEXT NOT NULL, -- 'lead_conversion', 'inventory_demand', 'sales_forecast'
  model_version TEXT NOT NULL DEFAULT '1.0',
  accuracy_score NUMERIC NOT NULL DEFAULT 0.0,
  precision_score NUMERIC DEFAULT 0.0,
  recall_score NUMERIC DEFAULT 0.0,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sample_size INTEGER NOT NULL DEFAULT 0,
  performance_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX idx_lead_conversion_predictions_lead_id ON public.lead_conversion_predictions(lead_id);
CREATE INDEX idx_lead_conversion_predictions_probability ON public.lead_conversion_predictions(conversion_probability DESC);
CREATE INDEX idx_inventory_demand_predictions_inventory_id ON public.inventory_demand_predictions(inventory_id);
CREATE INDEX idx_inventory_demand_predictions_demand_score ON public.inventory_demand_predictions(demand_score DESC);
CREATE INDEX idx_vehicle_velocity_make_model ON public.vehicle_velocity_tracking(make, model);
CREATE INDEX idx_market_intelligence_date ON public.market_intelligence(analysis_date DESC);
CREATE INDEX idx_competitive_analysis_vehicle ON public.competitive_analysis(vehicle_make, vehicle_model, vehicle_year);
CREATE INDEX idx_sales_forecasts_date ON public.sales_forecasts(forecast_date DESC);
CREATE INDEX idx_pipeline_forecasts_month ON public.pipeline_forecasts(forecast_month DESC);

-- Row Level Security Policies
ALTER TABLE public.sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_conversion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_demand_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_velocity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_model_performance ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can view sales forecasts" ON public.sales_forecasts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view lead predictions" ON public.lead_conversion_predictions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view pipeline forecasts" ON public.pipeline_forecasts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view inventory predictions" ON public.inventory_demand_predictions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view velocity tracking" ON public.vehicle_velocity_tracking FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view market intelligence" ON public.market_intelligence FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view competitive analysis" ON public.competitive_analysis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view model performance" ON public.prediction_model_performance FOR SELECT USING (auth.role() = 'authenticated');

-- Insert/Update policies for managers and admins
CREATE POLICY "Managers can manage sales forecasts" ON public.sales_forecasts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage lead predictions" ON public.lead_conversion_predictions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage pipeline forecasts" ON public.pipeline_forecasts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage inventory predictions" ON public.inventory_demand_predictions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage velocity tracking" ON public.vehicle_velocity_tracking FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage market intelligence" ON public.market_intelligence FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage competitive analysis" ON public.competitive_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);
CREATE POLICY "Managers can manage model performance" ON public.prediction_model_performance FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
);

-- Add predictive columns to existing tables
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS conversion_probability NUMERIC DEFAULT 0.0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS temperature_score INTEGER DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS predicted_close_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_prediction_update TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS demand_score INTEGER DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS predicted_sale_date DATE;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS velocity_category TEXT DEFAULT 'normal';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS price_competitiveness TEXT DEFAULT 'market';

-- Database Functions for Predictive Analytics
CREATE OR REPLACE FUNCTION public.calculate_lead_temperature(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
  temperature_score INTEGER := 0;
  days_since_last_reply INTEGER;
  total_messages INTEGER;
  response_rate NUMERIC;
BEGIN
  -- Calculate days since last reply
  SELECT EXTRACT(DAY FROM (now() - last_reply_at)) INTO days_since_last_reply
  FROM public.leads WHERE id = p_lead_id;
  
  -- Calculate total messages and response rate
  SELECT 
    COUNT(*) as total,
    CASE 
      WHEN COUNT(*) FILTER (WHERE direction = 'out') > 0 
      THEN COUNT(*) FILTER (WHERE direction = 'in')::NUMERIC / COUNT(*) FILTER (WHERE direction = 'out')
      ELSE 0 
    END as rate
  INTO total_messages, response_rate
  FROM public.conversations WHERE lead_id = p_lead_id;
  
  -- Base temperature calculation
  temperature_score := 50; -- Start at neutral
  
  -- Adjust based on response timing
  IF days_since_last_reply IS NULL OR days_since_last_reply > 14 THEN
    temperature_score := temperature_score - 30;
  ELSIF days_since_last_reply <= 1 THEN
    temperature_score := temperature_score + 25;
  ELSIF days_since_last_reply <= 3 THEN
    temperature_score := temperature_score + 15;
  ELSIF days_since_last_reply <= 7 THEN
    temperature_score := temperature_score + 5;
  ELSE
    temperature_score := temperature_score - 10;
  END IF;
  
  -- Adjust based on engagement
  IF total_messages > 10 THEN
    temperature_score := temperature_score + 15;
  ELSIF total_messages > 5 THEN
    temperature_score := temperature_score + 10;
  END IF;
  
  -- Adjust based on response rate
  IF response_rate > 0.7 THEN
    temperature_score := temperature_score + 20;
  ELSIF response_rate > 0.4 THEN
    temperature_score := temperature_score + 10;
  ELSIF response_rate < 0.2 THEN
    temperature_score := temperature_score - 15;
  END IF;
  
  -- Keep within bounds
  temperature_score := GREATEST(0, LEAST(100, temperature_score));
  
  RETURN temperature_score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_inventory_velocity_tracking()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO public.vehicle_velocity_tracking (
    make, model, year, body_style, avg_days_to_sell, total_sold, current_inventory_count, velocity_trend, last_sale_date
  )
  SELECT 
    i.make,
    i.model,
    i.year,
    i.body_style,
    AVG(CASE WHEN i.status = 'sold' THEN i.days_in_inventory ELSE NULL END) as avg_days,
    COUNT(CASE WHEN i.status = 'sold' THEN 1 END) as total_sold,
    COUNT(CASE WHEN i.status = 'available' THEN 1 END) as current_count,
    CASE 
      WHEN AVG(CASE WHEN i.status = 'sold' AND i.sold_at > now() - interval '30 days' THEN i.days_in_inventory END) < 
           AVG(CASE WHEN i.status = 'sold' AND i.sold_at BETWEEN now() - interval '60 days' AND now() - interval '30 days' THEN i.days_in_inventory END)
      THEN 'increasing'
      WHEN AVG(CASE WHEN i.status = 'sold' AND i.sold_at > now() - interval '30 days' THEN i.days_in_inventory END) > 
           AVG(CASE WHEN i.status = 'sold' AND i.sold_at BETWEEN now() - interval '60 days' AND now() - interval '30 days' THEN i.days_in_inventory END)
      THEN 'decreasing'
      ELSE 'stable'
    END as trend,
    MAX(CASE WHEN i.status = 'sold' THEN i.sold_at::date END) as last_sale
  FROM public.inventory i
  GROUP BY i.make, i.model, i.year, i.body_style
  ON CONFLICT (make, model, year, body_style) 
  DO UPDATE SET
    avg_days_to_sell = EXCLUDED.avg_days_to_sell,
    total_sold = EXCLUDED.total_sold,
    current_inventory_count = EXCLUDED.current_inventory_count,
    velocity_trend = EXCLUDED.velocity_trend,
    last_sale_date = EXCLUDED.last_sale_date,
    updated_at = now();
END;
$function$;
