
-- Create a function to get enhanced triggers with lead data
CREATE OR REPLACE FUNCTION public.get_enhanced_triggers()
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  trigger_type TEXT,
  trigger_data JSONB,
  trigger_score INTEGER,
  urgency_level TEXT,
  processed BOOLEAN,
  created_at TIMESTAMPTZ,
  lead_first_name TEXT,
  lead_last_name TEXT,
  vehicle_interest TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    et.id,
    et.lead_id,
    et.trigger_type,
    et.trigger_data,
    et.trigger_score,
    et.urgency_level,
    et.processed,
    et.created_at,
    l.first_name as lead_first_name,
    l.last_name as lead_last_name,
    l.vehicle_interest
  FROM public.enhanced_behavioral_triggers et
  LEFT JOIN public.leads l ON et.lead_id = l.id
  ORDER BY et.created_at DESC
  LIMIT 20;
END;
$$;
