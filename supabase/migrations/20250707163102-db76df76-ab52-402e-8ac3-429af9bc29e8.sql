-- Add index for name_text in ai_name_validations table for performance optimization
CREATE INDEX IF NOT EXISTS idx_ai_name_validations_name_text ON public.ai_name_validations(name_text);

-- Add index for vehicle_text in ai_vehicle_validations table for performance optimization  
CREATE INDEX IF NOT EXISTS idx_ai_vehicle_validations_vehicle_text ON public.ai_vehicle_validations(vehicle_text);