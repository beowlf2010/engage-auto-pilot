-- Clean up obvious test leads with invalid phone numbers or business names
UPDATE leads 
SET status = 'invalid', 
    is_hidden = true,
    updated_at = now()
WHERE 
  -- Leads with business/organization names as phone numbers
  EXISTS (
    SELECT 1 FROM phone_numbers 
    WHERE lead_id = leads.id 
    AND (
      number ILIKE '%commission%' OR
      number ILIKE '%tribal%' OR 
      number ILIKE '%gaming%' OR
      number ILIKE '%casino%' OR
      number ILIKE '%band%' OR
      number ILIKE '%creek%' OR
      number ILIKE '%poarch%' OR
      number ILIKE '%indians%' OR
      length(number) > 15 OR
      number ~ '[a-zA-Z]'
    )
  )
  -- Or leads with no phone numbers at all
  OR NOT EXISTS (
    SELECT 1 FROM phone_numbers 
    WHERE lead_id = leads.id 
    AND status = 'active'
    AND length(regexp_replace(number, '[^0-9]', '', 'g')) >= 10
  )
  -- Or obvious test leads
  OR first_name ILIKE '%test%' 
  OR last_name ILIKE '%test%'
  OR email ILIKE '%test%'
  OR vehicle_interest ILIKE '%test%';