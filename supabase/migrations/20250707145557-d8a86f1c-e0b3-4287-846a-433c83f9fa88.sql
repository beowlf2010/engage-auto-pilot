-- Create table for AI name validation learning
CREATE TABLE public.ai_name_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_text TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'denied')),
  decision_reason TEXT,
  times_approved INTEGER NOT NULL DEFAULT 0,
  times_denied INTEGER NOT NULL DEFAULT 0,
  times_seen INTEGER NOT NULL DEFAULT 1,
  confidence_score NUMERIC DEFAULT 0.0,
  detected_type TEXT,
  decided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name_text)
);

-- Create table for AI vehicle validation learning  
CREATE TABLE public.ai_vehicle_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_text TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'denied')),
  decision_reason TEXT,
  times_approved INTEGER NOT NULL DEFAULT 0,
  times_denied INTEGER NOT NULL DEFAULT 0,
  times_seen INTEGER NOT NULL DEFAULT 1,
  confidence_score NUMERIC DEFAULT 0.0,
  detected_issue TEXT,
  decided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vehicle_text)
);

-- Enable RLS
ALTER TABLE public.ai_name_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_vehicle_validations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view name validations" ON public.ai_name_validations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create name validations" ON public.ai_name_validations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update name validations" ON public.ai_name_validations FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view vehicle validations" ON public.ai_vehicle_validations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create vehicle validations" ON public.ai_vehicle_validations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update vehicle validations" ON public.ai_vehicle_validations FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_validation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_name_validations_updated_at
  BEFORE UPDATE ON public.ai_name_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_validation_updated_at();

CREATE TRIGGER update_vehicle_validations_updated_at
  BEFORE UPDATE ON public.ai_vehicle_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_validation_updated_at();