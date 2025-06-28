
-- Fix the infinite recursion by modifying the calculate_ai_strategy_for_lead function
-- to only update calculated fields and avoid re-triggering the same columns
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
  v_current_intensity text;
  v_current_bucket text;
  v_current_level integer;
BEGIN
  -- Get current calculated values to check if they need updating
  SELECT message_intensity, ai_strategy_bucket, ai_aggression_level
  INTO v_current_intensity, v_current_bucket, v_current_level
  FROM public.leads 
  WHERE id = p_lead_id;

  -- Use the provided parameters or fall back to existing values from the lead
  IF p_lead_status_type_name IS NULL OR p_lead_type_name IS NULL OR p_lead_source_name IS NULL THEN
    SELECT 
      COALESCE(p_lead_status_type_name, lead_status_type_name),
      COALESCE(p_lead_type_name, lead_type_name), 
      COALESCE(p_lead_source_name, lead_source_name)
    INTO p_lead_status_type_name, p_lead_type_name, p_lead_source_name
    FROM public.leads 
    WHERE id = p_lead_id;
  END IF;

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

  -- Only update if the calculated values have actually changed (prevent unnecessary updates)
  IF v_current_intensity IS DISTINCT FROM v_message_intensity OR 
     v_current_bucket IS DISTINCT FROM v_ai_strategy_bucket OR 
     v_current_level IS DISTINCT FROM v_ai_aggression_level THEN
    
    -- Update ONLY the calculated AI strategy fields, NOT the trigger columns
    -- This prevents infinite recursion by avoiding updates to lead_status_type_name, 
    -- lead_type_name, and lead_source_name which would re-trigger this function
    UPDATE public.leads 
    SET 
      message_intensity = v_message_intensity,
      ai_strategy_bucket = v_ai_strategy_bucket,
      ai_aggression_level = v_ai_aggression_level,
      ai_strategy_last_updated = now()
    WHERE id = p_lead_id;
  END IF;
END;
$$;

-- Also update the trigger function to handle the case where lead factors are being set for the first time
CREATE OR REPLACE FUNCTION public.trigger_calculate_ai_strategy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only calculate AI strategy if the lead factor fields have actually changed
  -- or if this is a new lead (INSERT operation)
  IF TG_OP = 'INSERT' OR (
    TG_OP = 'UPDATE' AND (
      OLD.lead_status_type_name IS DISTINCT FROM NEW.lead_status_type_name OR
      OLD.lead_type_name IS DISTINCT FROM NEW.lead_type_name OR
      OLD.lead_source_name IS DISTINCT FROM NEW.lead_source_name
    )
  ) THEN
    PERFORM public.calculate_ai_strategy_for_lead(
      NEW.id,
      NEW.lead_status_type_name,
      NEW.lead_type_name,
      NEW.lead_source_name
    );
  END IF;
  
  RETURN NEW;
END;
$$;
