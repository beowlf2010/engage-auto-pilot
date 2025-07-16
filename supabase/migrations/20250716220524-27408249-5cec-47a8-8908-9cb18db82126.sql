-- Enable AI emergency service (disable the emergency shutdown)
UPDATE ai_emergency_settings 
SET ai_disabled = false,
    disable_reason = NULL,
    disabled_at = NULL,
    disabled_by = NULL,
    updated_at = now()
WHERE ai_disabled = true;

-- If no settings exist, create default enabled state
INSERT INTO ai_emergency_settings (ai_disabled, updated_at)
SELECT false, now()
WHERE NOT EXISTS (SELECT 1 FROM ai_emergency_settings);

-- Enable AI opt-in for qualified leads (new, engaged leads with valid phone numbers and vehicle interest)
-- Using a subquery to limit to 50 leads for initial testing
UPDATE leads 
SET ai_opt_in = true,
    ai_stage = 'ready',
    next_ai_send_at = now() + interval '5 minutes',
    updated_at = now()
WHERE id IN (
  SELECT id FROM leads
  WHERE ai_opt_in = false
    AND status IN ('new', 'engaged')
    AND is_hidden != true
    AND vehicle_interest != 'finding the right vehicle for your needs'
    AND vehicle_interest IS NOT NULL
    AND vehicle_interest != ''
    AND EXISTS (
      SELECT 1 FROM phone_numbers 
      WHERE phone_numbers.lead_id = leads.id 
      AND phone_numbers.status = 'active'
      AND length(regexp_replace(phone_numbers.number, '[^0-9]', '', 'g')) >= 10
    )
    AND NOT EXISTS (
      SELECT 1 FROM compliance_suppression_list 
      WHERE compliance_suppression_list.contact IN (
        SELECT number FROM phone_numbers WHERE lead_id = leads.id
      )
      AND compliance_suppression_list.type = 'sms'
    )
  LIMIT 50
);