
-- Create trade_vehicles table to store detailed trade vehicle information
CREATE TABLE public.trade_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  year INTEGER,
  make TEXT,
  model TEXT,
  trim TEXT,
  mileage INTEGER,
  condition TEXT CHECK (condition IN ('excellent', 'very_good', 'good', 'fair', 'poor')),
  vin TEXT,
  exterior_color TEXT,
  interior_color TEXT,
  transmission TEXT,
  drivetrain TEXT,
  fuel_type TEXT,
  accident_history BOOLEAN DEFAULT false,
  service_records BOOLEAN DEFAULT false,
  title_type TEXT DEFAULT 'clean',
  liens_outstanding BOOLEAN DEFAULT false,
  modifications TEXT,
  additional_notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade_valuations table to store valuation data and history
CREATE TABLE public.trade_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_vehicle_id UUID NOT NULL REFERENCES public.trade_vehicles(id) ON DELETE CASCADE,
  valuation_source TEXT NOT NULL, -- 'kbb', 'edmunds', 'manual', 'dealer_estimate'
  trade_in_value NUMERIC,
  private_party_value NUMERIC,
  retail_value NUMERIC,
  wholesale_value NUMERIC,
  estimated_value NUMERIC, -- The value we're offering/using
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_conditions TEXT,
  depreciation_factors JSONB DEFAULT '{}'::jsonb,
  valuation_notes TEXT,
  appraised_by UUID REFERENCES public.profiles(id),
  is_final_offer BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade_appraisal_appointments table for scheduling trade evaluations
CREATE TABLE public.trade_appraisal_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_vehicle_id UUID NOT NULL REFERENCES public.trade_vehicles(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  appraisal_type TEXT NOT NULL DEFAULT 'in_person', -- 'in_person', 'virtual', 'photos_only'
  appraisal_status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
  appraiser_id UUID REFERENCES public.profiles(id),
  estimated_duration INTEGER DEFAULT 30, -- minutes
  special_instructions TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  appraisal_result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add trade-related fields to leads table
ALTER TABLE public.leads 
ADD COLUMN has_trade_vehicle BOOLEAN DEFAULT false,
ADD COLUMN trade_payoff_amount NUMERIC,
ADD COLUMN trade_financing_bank TEXT,
ADD COLUMN trade_decision_timeline TEXT, -- 'immediate', 'within_week', 'within_month', 'researching'
ADD COLUMN trade_motivation TEXT; -- 'upgrade', 'downsize', 'different_style', 'financial', 'reliability'

-- Create indexes for performance
CREATE INDEX idx_trade_vehicles_lead_id ON public.trade_vehicles(lead_id);
CREATE INDEX idx_trade_valuations_trade_vehicle_id ON public.trade_valuations(trade_vehicle_id);
CREATE INDEX idx_trade_valuations_valuation_date ON public.trade_valuations(valuation_date);
CREATE INDEX idx_trade_appraisal_appointments_trade_vehicle_id ON public.trade_appraisal_appointments(trade_vehicle_id);

-- Enable RLS on all trade tables
ALTER TABLE public.trade_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_appraisal_appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trade_vehicles
CREATE POLICY "Users can view trade vehicles for their leads" ON public.trade_vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = trade_vehicles.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Users can create trade vehicles for their leads" ON public.trade_vehicles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = trade_vehicles.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Users can update trade vehicles for their leads" ON public.trade_vehicles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = trade_vehicles.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create RLS policies for trade_valuations
CREATE POLICY "Users can view trade valuations for their leads" ON public.trade_valuations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trade_vehicles tv
      JOIN public.leads l ON l.id = tv.lead_id
      WHERE tv.id = trade_valuations.trade_vehicle_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Users can create trade valuations for their leads" ON public.trade_valuations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trade_vehicles tv
      JOIN public.leads l ON l.id = tv.lead_id
      WHERE tv.id = trade_valuations.trade_vehicle_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create RLS policies for trade_appraisal_appointments
CREATE POLICY "Users can view trade appraisal appointments for their leads" ON public.trade_appraisal_appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trade_vehicles tv
      JOIN public.leads l ON l.id = tv.lead_id
      WHERE tv.id = trade_appraisal_appointments.trade_vehicle_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Users can create trade appraisal appointments for their leads" ON public.trade_appraisal_appointments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trade_vehicles tv
      JOIN public.leads l ON l.id = tv.lead_id
      WHERE tv.id = trade_appraisal_appointments.trade_vehicle_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create function to update lead trade status
CREATE OR REPLACE FUNCTION update_lead_trade_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.leads 
    SET has_trade_vehicle = true 
    WHERE id = NEW.lead_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.leads 
    SET has_trade_vehicle = (
      SELECT COUNT(*) > 0 
      FROM public.trade_vehicles 
      WHERE lead_id = OLD.lead_id
    )
    WHERE id = OLD.lead_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update lead trade status
CREATE TRIGGER update_lead_trade_status_trigger
  AFTER INSERT OR DELETE ON public.trade_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_trade_status();
