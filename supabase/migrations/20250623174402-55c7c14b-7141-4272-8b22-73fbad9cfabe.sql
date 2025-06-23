
-- Fix Michael Dennis's phone number to be primary
-- First, let's find leads that don't have any primary phone numbers
UPDATE phone_numbers 
SET is_primary = true 
WHERE lead_id IN (
  SELECT l.id 
  FROM leads l 
  LEFT JOIN phone_numbers pn ON l.id = pn.lead_id AND pn.is_primary = true 
  WHERE pn.id IS NULL
  GROUP BY l.id
) 
AND id IN (
  SELECT DISTINCT ON (lead_id) id 
  FROM phone_numbers 
  WHERE lead_id IN (
    SELECT l.id 
    FROM leads l 
    LEFT JOIN phone_numbers pn ON l.id = pn.lead_id AND pn.is_primary = true 
    WHERE pn.id IS NULL
  )
  ORDER BY lead_id, priority ASC
);

-- Add an index to improve phone number queries
CREATE INDEX IF NOT EXISTS idx_phone_numbers_lead_primary ON phone_numbers(lead_id, is_primary) WHERE is_primary = true;
