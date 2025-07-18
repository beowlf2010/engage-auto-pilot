
-- Fix stuck AI automation leads - Data cleanup and preventive measures

-- Step 1: Identify and fix leads with AI enabled but no phone numbers
UPDATE leads 
SET ai_opt_in = false,
    ai_sequence_paused = true,
    ai_pause_reason = 'No valid phone number found',
    next_ai_send_at = null,
    updated_at = now()
WHERE ai_opt_in = true 
  AND id NOT IN (
    SELECT DISTINCT lead_id 
    FROM phone_numbers 
    WHERE is_primary = true 
      AND number IS NOT NULL 
      AND number != '+15551234567'
      AND length(regexp_replace(number, '[^0-9]', '', 'g')) >= 10
  );

-- Step 2: Disable AI for leads marked as sold/closed/lost
UPDATE leads 
SET ai_opt_in = false,
    ai_sequence_paused = true,
    ai_pause_reason = 'Lead marked as sold/closed',
    next_ai_send_at = null,
    updated_at = now()
WHERE ai_opt_in = true 
  AND status IN ('sold', 'closed', 'lost');

-- Step 3: Reset overdue leads that now have valid phone numbers to be processed soon
UPDATE leads 
SET next_ai_send_at = now() + interval '2 minutes',
    ai_sequence_paused = false,
    ai_pause_reason = null,
    updated_at = now()
WHERE ai_opt_in = true 
  AND next_ai_send_at < now() - interval '1 hour'
  AND id IN (
    SELECT DISTINCT lead_id 
    FROM phone_numbers 
    WHERE is_primary = true 
      AND number IS NOT NULL 
      AND number != '+15551234567'
      AND length(regexp_replace(number, '[^0-9]', '', 'g')) >= 10
  );

-- Step 4: Create function to validate lead phone numbers
CREATE OR REPLACE FUNCTION validate_lead_phone_for_ai()
RETURNS TRIGGER AS $$
BEGIN
  -- If AI is being enabled, ensure lead has a valid phone number
  IF NEW.ai_opt_in = true AND (OLD.ai_opt_in IS NULL OR OLD.ai_opt_in = false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM phone_numbers 
      WHERE lead_id = NEW.id 
        AND is_primary = true 
        AND number IS NOT NULL 
        AND number != '+15551234567'
        AND length(regexp_replace(number, '[^0-9]', '', 'g')) >= 10
    ) THEN
      -- Automatically disable AI if no valid phone number
      NEW.ai_opt_in := false;
      NEW.ai_sequence_paused := true;
      NEW.ai_pause_reason := 'Cannot enable AI: no valid phone number';
      NEW.next_ai_send_at := null;
      
      RAISE NOTICE 'AI disabled for lead % due to missing valid phone number', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to validate phone numbers when AI is enabled
DROP TRIGGER IF EXISTS validate_ai_phone_trigger ON leads;
CREATE TRIGGER validate_ai_phone_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION validate_lead_phone_for_ai();

-- Step 6: Create function to monitor stuck automation runs
CREATE OR REPLACE FUNCTION get_stuck_leads_report()
RETURNS TABLE(
  lead_id uuid,
  first_name text,
  last_name text,
  phone_number text,
  ai_stage text,
  next_ai_send_at timestamp with time zone,
  minutes_overdue numeric,
  has_valid_phone boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.first_name,
    l.last_name,
    COALESCE(pn.number, 'NO PHONE') as phone_number,
    l.ai_stage,
    l.next_ai_send_at,
    EXTRACT(EPOCH FROM (now() - l.next_ai_send_at)) / 60 as minutes_overdue,
    CASE 
      WHEN pn.number IS NOT NULL 
           AND pn.number != '+15551234567'
           AND length(regexp_replace(pn.number, '[^0-9]', '', 'g')) >= 10 
      THEN true 
      ELSE false 
    END as has_valid_phone
  FROM leads l
  LEFT JOIN phone_numbers pn ON pn.lead_id = l.id AND pn.is_primary = true
  WHERE l.ai_opt_in = true 
    AND l.next_ai_send_at IS NOT NULL
    AND l.next_ai_send_at < now() - interval '30 minutes'
  ORDER BY l.next_ai_send_at ASC;
END;
$$ LANGUAGE plpgsql;
