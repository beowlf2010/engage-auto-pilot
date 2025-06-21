
-- First, let's add a phone number for Marvin Howard and reset his AI stage
-- We'll use a placeholder phone number that can be updated with the real one later

UPDATE leads 
SET 
  ai_stage = 'initial_contact',
  ai_messages_sent = 0,
  message_intensity = 'gentle',
  ai_sequence_paused = false,
  next_ai_send_at = NULL,
  pending_human_response = false
WHERE id = (
  SELECT id FROM leads 
  WHERE first_name = 'Marvin' AND last_name = 'Howard' 
  LIMIT 1
);

-- Add a phone number for Marvin (using placeholder - update with real number)
INSERT INTO phone_numbers (lead_id, number, is_primary, type, status)
SELECT id, '+15551234567', true, 'cell', 'active'
FROM leads 
WHERE first_name = 'Marvin' AND last_name = 'Howard'
AND NOT EXISTS (
  SELECT 1 FROM phone_numbers WHERE lead_id = leads.id
);

-- Clear any existing outbound conversations for Marvin that weren't delivered
DELETE FROM conversations 
WHERE lead_id = (
  SELECT id FROM leads 
  WHERE first_name = 'Marvin' AND last_name = 'Howard' 
  LIMIT 1
) 
AND direction = 'out'
AND sms_status IN ('pending', 'failed');

-- Clear any pending AI messages in the approval queue
DELETE FROM ai_message_approval_queue
WHERE lead_id = (
  SELECT id FROM leads 
  WHERE first_name = 'Marvin' AND last_name = 'Howard' 
  LIMIT 1
);
