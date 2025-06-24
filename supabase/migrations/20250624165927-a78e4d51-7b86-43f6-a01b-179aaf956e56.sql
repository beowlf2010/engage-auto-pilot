
-- Add new columns to leads table to store lead factors and AI strategy
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_status_type_name text,
ADD COLUMN IF NOT EXISTS lead_type_name text,
ADD COLUMN IF NOT EXISTS lead_source_name text,
ADD COLUMN IF NOT EXISTS message_intensity text DEFAULT 'gentle',
ADD COLUMN IF NOT EXISTS ai_strategy_bucket text,
ADD COLUMN IF NOT EXISTS ai_aggression_level integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS ai_strategy_last_updated timestamp with time zone DEFAULT now();

-- Create index for better performance on AI strategy queries
CREATE INDEX IF NOT EXISTS idx_leads_ai_strategy ON public.leads(ai_strategy_bucket, message_intensity, ai_aggression_level);

-- Create function to update AI strategy based on lead factors
CREATE OR REPLACE FUNCTION public.calculate_ai_strategy_for_lead(
  p_lead_id uuid,
  p_lead_status_type_name text DEFAULT NULL,
  p_lead_type_name text DEFAULT NULL,
  p_lead_source_name text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_intensity text := 'gentle';
  v_ai_strategy_bucket text := 'other_unknown';
  v_ai_aggression_level integer := 3;
BEGIN
  -- Determine message intensity based on lead factors
  IF p_lead_status_type_name ILIKE '%hot%' OR p_lead_status_type_name ILIKE '%urgent%' THEN
    v_message_intensity := 'aggressive';
    v_ai_aggression_level := 5;
  ELSIF p_lead_status_type_name ILIKE '%warm%' OR p_lead_type_name ILIKE '%finance%' THEN
    v_message_intensity := 'standard';
    v_ai_aggression_level := 4;
  ELSIF p_lead_status_type_name ILIKE '%cold%' OR p_lead_source_name ILIKE '%referral%' THEN
    v_message_intensity := 'gentle';
    v_ai_aggression_level := 2;
  END IF;

  -- Determine AI strategy bucket based on source
  IF p_lead_source_name ILIKE '%autotrader%' OR p_lead_source_name ILIKE '%cars.com%' OR p_lead_source_name ILIKE '%cargurus%' THEN
    v_ai_strategy_bucket := 'marketplace';
    v_ai_aggression_level := GREATEST(v_ai_aggression_level, 4);
  ELSIF p_lead_source_name ILIKE '%gm%' OR p_lead_source_name ILIKE '%finance%' THEN
    v_ai_strategy_bucket := 'oem_gm_finance';
  ELSIF p_lead_source_name ILIKE '%website%' OR p_lead_source_name ILIKE '%dealer%' THEN
    v_ai_strategy_bucket := 'website_forms';
  ELSIF p_lead_source_name ILIKE '%phone%' OR p_lead_source_name ILIKE '%call%' THEN
    v_ai_strategy_bucket := 'phone_up';
    v_ai_aggression_level := 5;
  ELSIF p_lead_source_name ILIKE '%referral%' THEN
    v_ai_strategy_bucket := 'referral_repeat';
    v_ai_aggression_level := 2;
  ELSIF p_lead_source_name ILIKE '%trade%' THEN
    v_ai_strategy_bucket := 'trade_in_tools';
  END IF;

  -- Update the lead with calculated AI strategy
  UPDATE public.leads 
  SET 
    lead_status_type_name = COALESCE(p_lead_status_type_name, lead_status_type_name),
    lead_type_name = COALESCE(p_lead_type_name, lead_type_name),
    lead_source_name = COALESCE(p_lead_source_name, lead_source_name),
    message_intensity = v_message_intensity,
    ai_strategy_bucket = v_ai_strategy_bucket,
    ai_aggression_level = v_ai_aggression_level,
    ai_strategy_last_updated = now()
  WHERE id = p_lead_id;
END;
$$;

-- Create trigger to automatically calculate AI strategy when lead factors change
CREATE OR REPLACE FUNCTION public.trigger_calculate_ai_strategy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.calculate_ai_strategy_for_lead(
    NEW.id,
    NEW.lead_status_type_name,
    NEW.lead_type_name,
    NEW.lead_source_name
  );
  RETURN NEW;
END;
$$;

-- Create trigger that fires when lead factors are updated
DROP TRIGGER IF EXISTS update_ai_strategy_on_lead_change ON public.leads;
CREATE TRIGGER update_ai_strategy_on_lead_change
  AFTER INSERT OR UPDATE OF lead_status_type_name, lead_type_name, lead_source_name
  ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_calculate_ai_strategy();
