-- PRIORITY 1: EMERGENCY SUPPRESSION - Add remaining 5 spam victim numbers to suppression list
-- These numbers received 2,090+ spam messages from the rogue AI automation
INSERT INTO public.compliance_suppression_list (contact, type, reason, details, lead_id)
VALUES 
  ('+18509102055', 'sms', 'Emergency suppression - victim of automated SMS spam', 'Phone number received excessive automated messages from bypassed AI system. Added for TCPA compliance.', NULL),
  ('+12512408319', 'sms', 'Emergency suppression - victim of automated SMS spam', 'Phone number received excessive automated messages from bypassed AI system. Added for TCPA compliance.', NULL),
  ('+16012971485', 'sms', 'Emergency suppression - victim of automated SMS spam', 'Phone number received excessive automated messages from bypassed AI system. Added for TCPA compliance.', NULL),
  ('+18502251308', 'sms', 'Emergency suppression - victim of automated SMS spam', 'Phone number received excessive automated messages from bypassed AI system. Added for TCPA compliance.', NULL),
  ('+12514017918', 'sms', 'Emergency suppression - victim of automated SMS spam', 'Phone number received excessive automated messages from bypassed AI system. Added for TCPA compliance.', NULL)
ON CONFLICT (contact, type) DO NOTHING;

-- PRIORITY 4: Add database constraints to prevent future violations
-- Function to enforce message rate limiting (prevent multiple messages within 10 minutes to same lead)
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  recent_message_count integer;
  lead_phone_number text;
BEGIN
  -- Get phone number for this lead
  SELECT pn.number INTO lead_phone_number
  FROM public.phone_numbers pn 
  WHERE pn.lead_id = NEW.lead_id 
  LIMIT 1;
  
  -- Check if lead received a message in the last 10 minutes
  SELECT COUNT(*) INTO recent_message_count
  FROM public.conversations c
  WHERE c.lead_id = NEW.lead_id
    AND c.direction = 'out'
    AND c.sent_at > now() - interval '10 minutes';
    
  -- Prevent message if rate limit exceeded
  IF recent_message_count >= 1 THEN
    RAISE EXCEPTION 'Rate limit violation: Lead % (phone %) already received a message in the last 10 minutes. Message blocked for compliance.', 
      NEW.lead_id, COALESCE(lead_phone_number, 'unknown');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to enforce rate limiting on all outbound conversations
CREATE TRIGGER enforce_conversation_rate_limit
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  WHEN (NEW.direction = 'out')
  EXECUTE FUNCTION public.enforce_message_rate_limit();

-- Function to auto-suppress numbers with repeated failures (3+ failures in 1 hour)
CREATE OR REPLACE FUNCTION public.auto_suppress_high_failure_numbers()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-suppress phone numbers with 3+ failed messages in 1 hour (stricter than existing 5/24h rule)
  INSERT INTO public.compliance_suppression_list (contact, type, reason, details)
  SELECT DISTINCT
    pn.number as contact,
    'sms' as type,
    'Auto-suppressed - high failure rate (emergency compliance)' as reason,
    format('Phone number has %s failed messages in the last hour. Auto-suppressed for compliance.', COUNT(*)) as details
  FROM public.conversations c
  JOIN public.phone_numbers pn ON pn.lead_id = c.lead_id
  WHERE c.sms_status = 'failed'
    AND c.sent_at > now() - interval '1 hour'
    AND c.direction = 'out'
  GROUP BY pn.number
  HAVING COUNT(*) >= 3
  ON CONFLICT (contact, type) DO NOTHING;
END;
$function$;

-- PRIORITY 5: Create monitoring for mass message failures
CREATE OR REPLACE FUNCTION public.detect_mass_message_failures()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Check for mass failures (>10 failures in 1 hour) and log alerts
  INSERT INTO public.ai_notifications (
    lead_id,
    notification_type,
    title,
    message,
    urgency_level,
    ai_confidence,
    metadata
  )
  SELECT 
    c.lead_id,
    'mass_failure_alert',
    'COMPLIANCE ALERT: Mass Message Failures Detected',
    format('Detected %s failed messages in the last hour. Potential compliance violation.', COUNT(*)),
    'critical',
    1.0,
    jsonb_build_object(
      'failure_count', COUNT(*),
      'time_window', '1 hour',
      'alert_type', 'mass_failure_detection'
    )
  FROM public.conversations c
  WHERE c.sms_status = 'failed'
    AND c.sent_at > now() - interval '1 hour'
    AND c.direction = 'out'
  GROUP BY c.lead_id
  HAVING COUNT(*) >= 10
  ON CONFLICT DO NOTHING;
  
  -- Auto-suppress on detection of mass failures
  PERFORM public.auto_suppress_high_failure_numbers();
END;
$function$;