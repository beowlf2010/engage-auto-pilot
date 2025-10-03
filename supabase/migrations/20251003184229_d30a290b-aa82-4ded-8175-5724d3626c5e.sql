-- Add phone_number column to conversations table for thread matching
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create index for fast phone number lookups
CREATE INDEX IF NOT EXISTS idx_conversations_phone_number 
ON conversations(phone_number);

-- Create composite index for phone_number + sent_at (for conversation ordering)
CREATE INDEX IF NOT EXISTS idx_conversations_phone_sent 
ON conversations(phone_number, sent_at DESC);

-- Backfill phone_number from leads table via lead_id
UPDATE conversations c
SET phone_number = (
  SELECT pn.number 
  FROM phone_numbers pn
  WHERE pn.lead_id = c.lead_id 
    AND pn.is_primary = true
  LIMIT 1
)
WHERE c.phone_number IS NULL 
  AND c.lead_id IS NOT NULL;

-- For any remaining nulls, try to get any phone number for the lead
UPDATE conversations c
SET phone_number = (
  SELECT pn.number 
  FROM phone_numbers pn
  WHERE pn.lead_id = c.lead_id
  ORDER BY pn.priority ASC, pn.created_at ASC
  LIMIT 1
)
WHERE c.phone_number IS NULL 
  AND c.lead_id IS NOT NULL;

-- Add trigger to auto-populate phone_number on insert
CREATE OR REPLACE FUNCTION set_conversation_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_number IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT pn.number INTO NEW.phone_number
    FROM phone_numbers pn
    WHERE pn.lead_id = NEW.lead_id 
      AND pn.is_primary = true
    LIMIT 1;
    
    -- Fallback to any phone number if no primary
    IF NEW.phone_number IS NULL THEN
      SELECT pn.number INTO NEW.phone_number
      FROM phone_numbers pn
      WHERE pn.lead_id = NEW.lead_id
      ORDER BY pn.priority ASC, pn.created_at ASC
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_conversation_phone_number
BEFORE INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_conversation_phone_number();