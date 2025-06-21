
-- Create the RPO Code Intelligence table
CREATE TABLE public.rpo_code_intelligence (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rpo_code text UNIQUE NOT NULL,
  category text, -- 'engine', 'transmission', 'interior', 'exterior', 'package', 'option'
  description text,
  feature_type text, -- 'color', 'trim_level', 'engine_option', 'package_feature', etc.
  mapped_value text, -- actual engine code, color name, etc.
  confidence_score numeric DEFAULT 1.0,
  learned_from_source text[] DEFAULT ARRAY['manual'], -- 'manual', 'pattern_matching', 'correlation'
  vehicle_makes text[], -- Which makes this RPO applies to (Chevrolet, GMC, etc.)
  model_years integer[], -- Which model years this RPO is valid for
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.rpo_code_intelligence ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read RPO data
CREATE POLICY "Allow authenticated users to read RPO intelligence" 
  ON public.rpo_code_intelligence 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policy to allow managers and admins to insert/update RPO data
CREATE POLICY "Allow managers and admins to modify RPO intelligence" 
  ON public.rpo_code_intelligence 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Create index for better performance
CREATE INDEX idx_rpo_code_intelligence_rpo_code ON public.rpo_code_intelligence(rpo_code);
CREATE INDEX idx_rpo_code_intelligence_category ON public.rpo_code_intelligence(category);

-- Create table for RPO learning sessions (track manual entries)
CREATE TABLE public.rpo_learning_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name text,
  source_data text, -- Raw pasted data
  processed_mappings jsonb, -- Extracted RPO mappings
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

-- Add RLS for learning sessions
ALTER TABLE public.rpo_learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow managers and admins to manage learning sessions" 
  ON public.rpo_learning_sessions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Function to update RPO intelligence
CREATE OR REPLACE FUNCTION public.upsert_rpo_intelligence(
  p_rpo_code text,
  p_category text,
  p_description text,
  p_feature_type text DEFAULT NULL,
  p_mapped_value text DEFAULT NULL,
  p_confidence_score numeric DEFAULT 1.0,
  p_vehicle_makes text[] DEFAULT NULL,
  p_model_years integer[] DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  intelligence_id uuid;
BEGIN
  INSERT INTO public.rpo_code_intelligence (
    rpo_code, category, description, feature_type, mapped_value, 
    confidence_score, vehicle_makes, model_years
  )
  VALUES (
    p_rpo_code, p_category, p_description, p_feature_type, p_mapped_value,
    p_confidence_score, p_vehicle_makes, p_model_years
  )
  ON CONFLICT (rpo_code) 
  DO UPDATE SET
    category = COALESCE(EXCLUDED.category, rpo_code_intelligence.category),
    description = COALESCE(EXCLUDED.description, rpo_code_intelligence.description),
    feature_type = COALESCE(EXCLUDED.feature_type, rpo_code_intelligence.feature_type),
    mapped_value = COALESCE(EXCLUDED.mapped_value, rpo_code_intelligence.mapped_value),
    confidence_score = GREATEST(EXCLUDED.confidence_score, rpo_code_intelligence.confidence_score),
    vehicle_makes = COALESCE(EXCLUDED.vehicle_makes, rpo_code_intelligence.vehicle_makes),
    model_years = COALESCE(EXCLUDED.model_years, rpo_code_intelligence.model_years),
    updated_at = now()
  RETURNING id INTO intelligence_id;
  
  RETURN intelligence_id;
END;
$$;
