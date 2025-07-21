
-- COMPREHENSIVE AI MESSAGE PREVENTION SYSTEM
-- This creates multiple layers of protection to prevent short/low-quality messages

-- 1. Create enhanced emergency settings with multiple kill switches
CREATE TABLE IF NOT EXISTS public.ai_message_safeguards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  system_name text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  safeguard_type text NOT NULL, -- 'length_check', 'content_filter', 'emergency_stop'
  configuration jsonb NOT NULL DEFAULT '{}',
  last_triggered_at timestamp with time zone,
  trigger_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create message content validation table
CREATE TABLE IF NOT EXISTS public.ai_message_blacklist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_content text NOT NULL UNIQUE,
  block_type text NOT NULL DEFAULT 'exact_match', -- 'exact_match', 'contains', 'pattern'
  reason text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create real-time message monitoring table
CREATE TABLE IF NOT EXISTS public.ai_message_monitoring (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message_content text NOT NULL,
  message_length integer NOT NULL,
  quality_score numeric DEFAULT 0,
  validation_status text NOT NULL, -- 'passed', 'failed', 'flagged'
  validation_failures jsonb DEFAULT '[]',
  lead_id uuid,
  blocked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Insert critical safeguards
INSERT INTO public.ai_message_safeguards (system_name, safeguard_type, configuration) VALUES
('minimum_length_check', 'length_check', '{"min_length": 20, "strict_mode": true}'),
('content_blacklist_filter', 'content_filter', '{"case_sensitive": false, "partial_match": true}'),
('emergency_auto_disable', 'emergency_stop', '{"trigger_threshold": 3, "auto_disable_duration_hours": 24}'),
('human_approval_required', 'emergency_stop', '{"force_approval": true, "bypass_disabled": true}'),
('quality_score_minimum', 'content_filter', '{"min_quality_score": 0.7, "reject_below": true}');

-- 5. Insert blacklisted content (the exact messages we want to prevent)
INSERT INTO public.ai_message_blacklist (blocked_content, block_type, reason) VALUES
('OK', 'exact_match', 'Too short and unprofessional'),
('ok', 'exact_match', 'Too short and unprofessional'),
('Yes', 'exact_match', 'Too short and unprofessional'),
('yes', 'exact_match', 'Too short and unprofessional'),
('No', 'exact_match', 'Too short and unprofessional'),
('no', 'exact_match', 'Too short and unprofessional'),
('K', 'exact_match', 'Too short and unprofessional'),
('k', 'exact_match', 'Too short and unprofessional'),
('Sure', 'exact_match', 'Too short and unprofessional'),
('sure', 'exact_match', 'Too short and unprofessional'),
('Thanks', 'exact_match', 'Too short without context'),
('thanks', 'exact_match', 'Too short without context'),
('Thank you', 'exact_match', 'Too short without context'),
('Got it', 'exact_match', 'Too short and unprofessional'),
('Understood', 'exact_match', 'Too short without context');

-- 6. Create validation function that will be used everywhere
CREATE OR REPLACE FUNCTION public.validate_ai_message_content(
  p_message_content text,
  p_lead_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  validation_result jsonb := '{"valid": true, "failures": []}'::jsonb;
  blacklist_item record;
  safeguard record;
  message_length integer;
  quality_score numeric := 0.5;
BEGIN
  -- Initialize
  message_length := LENGTH(TRIM(p_message_content));
  
  -- Check if AI is completely disabled
  IF EXISTS (
    SELECT 1 FROM public.ai_emergency_settings 
    WHERE ai_disabled = true
  ) THEN
    validation_result := jsonb_set(validation_result, '{valid}', 'false');
    validation_result := jsonb_set(validation_result, '{failures}', 
      validation_result->'failures' || '["AI system is disabled"]'::jsonb);
  END IF;
  
  -- Check minimum length requirement
  SELECT * INTO safeguard 
  FROM public.ai_message_safeguards 
  WHERE system_name = 'minimum_length_check' AND is_enabled = true;
  
  IF FOUND THEN
    IF message_length < (safeguard.configuration->>'min_length')::integer THEN
      validation_result := jsonb_set(validation_result, '{valid}', 'false');
      validation_result := jsonb_set(validation_result, '{failures}', 
        validation_result->'failures' || ('["Message too short: ' || message_length || ' characters (minimum: ' || (safeguard.configuration->>'min_length') || ')"]')::jsonb);
    END IF;
  END IF;
  
  -- Check blacklist
  FOR blacklist_item IN 
    SELECT * FROM public.ai_message_blacklist 
    WHERE is_active = true
  LOOP
    IF blacklist_item.block_type = 'exact_match' AND 
       TRIM(LOWER(p_message_content)) = LOWER(blacklist_item.blocked_content) THEN
      validation_result := jsonb_set(validation_result, '{valid}', 'false');
      validation_result := jsonb_set(validation_result, '{failures}', 
        validation_result->'failures' || ('["Blocked content: ' || blacklist_item.reason || '"]')::jsonb);
    ELSIF blacklist_item.block_type = 'contains' AND 
          LOWER(p_message_content) LIKE '%' || LOWER(blacklist_item.blocked_content) || '%' THEN
      validation_result := jsonb_set(validation_result, '{valid}', 'false');
      validation_result := jsonb_set(validation_result, '{failures}', 
        validation_result->'failures' || ('["Contains blocked content: ' || blacklist_item.reason || '"]')::jsonb);
    END IF;
  END LOOP;
  
  -- Log the validation attempt
  INSERT INTO public.ai_message_monitoring (
    message_content, message_length, quality_score, 
    validation_status, validation_failures, lead_id
  ) VALUES (
    p_message_content, message_length, quality_score,
    CASE WHEN validation_result->>'valid' = 'true' THEN 'passed' ELSE 'failed' END,
    validation_result->'failures',
    p_lead_id
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to auto-disable AI when bad messages detected
CREATE OR REPLACE FUNCTION public.trigger_emergency_ai_shutdown()
RETURNS trigger AS $$
DECLARE
  recent_failures integer;
  safeguard record;
BEGIN
  -- Only check failed validations
  IF NEW.validation_status = 'failed' THEN
    -- Count recent failures (last 10 minutes)
    SELECT COUNT(*) INTO recent_failures
    FROM public.ai_message_monitoring
    WHERE validation_status = 'failed' 
      AND created_at > now() - interval '10 minutes';
    
    -- Get emergency auto-disable settings
    SELECT * INTO safeguard
    FROM public.ai_message_safeguards
    WHERE system_name = 'emergency_auto_disable' AND is_enabled = true;
    
    IF FOUND AND recent_failures >= (safeguard.configuration->>'trigger_threshold')::integer THEN
      -- EMERGENCY SHUTDOWN
      UPDATE public.ai_emergency_settings 
      SET ai_disabled = true,
          disable_reason = 'AUTO-SHUTDOWN: Multiple validation failures detected',
          disabled_at = now();
      
      UPDATE public.ai_automation_control
      SET automation_enabled = false,
          emergency_stop = true;
      
      -- Update safeguard trigger count
      UPDATE public.ai_message_safeguards
      SET trigger_count = trigger_count + 1,
          last_triggered_at = now()
      WHERE system_name = 'emergency_auto_disable';
      
      RAISE NOTICE 'EMERGENCY AI SHUTDOWN TRIGGERED: % failures in 10 minutes', recent_failures;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS emergency_ai_shutdown_trigger ON public.ai_message_monitoring;
CREATE TRIGGER emergency_ai_shutdown_trigger
  AFTER INSERT ON public.ai_message_monitoring
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_emergency_ai_shutdown();

-- 8. Enable RLS on new tables
ALTER TABLE public.ai_message_safeguards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_monitoring ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies
CREATE POLICY "Managers can manage safeguards" ON public.ai_message_safeguards
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('admin', 'manager')
  ));

CREATE POLICY "Managers can manage blacklist" ON public.ai_message_blacklist
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('admin', 'manager')
  ));

CREATE POLICY "Managers can view monitoring" ON public.ai_message_monitoring
  FOR SELECT TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('admin', 'manager')
  ));

-- 10. Force human approval for ALL AI messages during recovery
UPDATE public.ai_message_safeguards 
SET is_enabled = true,
    configuration = jsonb_set(configuration, '{force_approval}', 'true')
WHERE system_name = 'human_approval_required';

-- 11. Verification query to show all protections are active
SELECT 
  'Safeguard System' as protection_type,
  system_name,
  is_enabled as active,
  configuration
FROM public.ai_message_safeguards
WHERE is_enabled = true
ORDER BY system_name;
