-- Phase 1: Fix Existing Data
-- Add phone number to "Unknown Caller" lead
INSERT INTO phone_numbers (id, lead_id, number, type, is_primary, status, priority, created_at)
VALUES (
  gen_random_uuid(),
  'b09bc97c-5478-407c-987f-2f37dab3df8c',
  '+12513593158',
  'cell',
  true,
  'active',
  1,
  now()
)
ON CONFLICT DO NOTHING;

-- Update conversation record to set phone number for thread matching
UPDATE conversations
SET phone_number = '+12513593158'
WHERE id = '07cd4c34-257f-45a3-9db8-13216728daa8'
  AND phone_number IS NULL;