-- Create phone number normalization function
CREATE OR REPLACE FUNCTION normalize_phone_number(phone text)
RETURNS text AS $$
DECLARE
  digits_only text;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  digits_only := regexp_replace(phone, '[^0-9]', '', 'g');
  
  IF digits_only = '' THEN
    RETURN NULL;
  END IF;
  
  -- Handle US numbers
  IF length(digits_only) = 10 THEN
    -- 10 digits - add +1 prefix
    RETURN '+1' || digits_only;
  ELSIF length(digits_only) = 11 AND left(digits_only, 1) = '1' THEN
    -- 11 digits starting with 1 - add + prefix
    RETURN '+' || digits_only;
  ELSIF length(digits_only) = 11 THEN
    -- 11 digits not starting with 1 - might be international
    RETURN '+' || digits_only;
  ELSIF length(digits_only) > 11 THEN
    -- Already has country code
    RETURN '+' || digits_only;
  ELSE
    -- Fallback for other cases
    IF left(phone, 1) = '+' THEN
      RETURN phone;
    ELSE
      RETURN '+' || digits_only;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update trigger to normalize phone numbers on insert
CREATE OR REPLACE FUNCTION set_conversation_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_number IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT normalize_phone_number(pn.number) INTO NEW.phone_number
    FROM phone_numbers pn
    WHERE pn.lead_id = NEW.lead_id 
      AND pn.is_primary = true
    LIMIT 1;
    
    -- Fallback to any phone number if no primary
    IF NEW.phone_number IS NULL THEN
      SELECT normalize_phone_number(pn.number) INTO NEW.phone_number
      FROM phone_numbers pn
      WHERE pn.lead_id = NEW.lead_id
      ORDER BY pn.priority ASC, pn.created_at ASC
      LIMIT 1;
    END IF;
  ELSIF NEW.phone_number IS NOT NULL THEN
    -- Always normalize the phone number if provided
    NEW.phone_number := normalize_phone_number(NEW.phone_number);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing phone numbers with normalized values
UPDATE conversations
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number IS NOT NULL 
  AND phone_number != normalize_phone_number(phone_number);

-- Also normalize phone_numbers in the phone_numbers table for consistency
UPDATE phone_numbers
SET number = normalize_phone_number(number)
WHERE number IS NOT NULL 
  AND number != normalize_phone_number(number);