-- Create unique constraint to prevent duplicate suppressions
ALTER TABLE public.compliance_suppression_list 
ADD CONSTRAINT compliance_suppression_unique UNIQUE (contact, type);

-- Priority 1: Add the problematic phone number to suppression list to stop spam immediately
INSERT INTO public.compliance_suppression_list (contact, type, reason, details, lead_id)
VALUES ('+17033076761', 'sms', 'Repeated delivery failures causing spam', 'Phone number +17033076761 has multiple failed delivery attempts. Adding to suppression list to prevent further spam attempts.', NULL)
ON CONFLICT (contact, type) DO NOTHING;

-- Add function to check for repeated message failures and auto-suppress
CREATE OR REPLACE FUNCTION public.auto_suppress_failed_numbers()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-suppress phone numbers with more than 5 failed messages in 24 hours
  INSERT INTO public.compliance_suppression_list (contact, type, reason, details)
  SELECT DISTINCT
    pn.number as contact,
    'sms' as type,
    'Auto-suppressed due to repeated failures' as reason,
    format('Phone number has %s failed messages in the last 24 hours', COUNT(*)) as details
  FROM public.conversations c
  JOIN public.phone_numbers pn ON pn.lead_id = c.lead_id
  WHERE c.sms_status = 'failed'
    AND c.sent_at > now() - interval '24 hours'
    AND c.direction = 'out'
  GROUP BY pn.number
  HAVING COUNT(*) >= 5
  ON CONFLICT (contact, type) DO NOTHING;
END;
$function$;

-- Add function to check for message sending frequency to prevent spam
CREATE OR REPLACE FUNCTION public.check_message_rate_limit(p_phone_number text, p_limit_minutes integer DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  recent_messages_count integer;
BEGIN
  -- Check how many messages were sent to this number in the last X minutes
  SELECT COUNT(*) INTO recent_messages_count
  FROM public.conversations c
  JOIN public.phone_numbers pn ON pn.lead_id = c.lead_id
  WHERE pn.number = p_phone_number
    AND c.direction = 'out'
    AND c.sent_at > now() - (p_limit_minutes || ' minutes')::interval;
  
  -- Return false if rate limit exceeded (more than 1 message in time window)
  RETURN recent_messages_count < 1;
END;
$function$;