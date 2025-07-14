-- Fix lead scheduling for immediate testing
-- Update 3 leads with AI enabled to send immediately
UPDATE leads 
SET next_ai_send_at = now() + interval '30 seconds',
    ai_stage = 'active',
    updated_at = now()
WHERE ai_opt_in = true 
  AND ai_sequence_paused = false
  AND next_ai_send_at > now() + interval '1 hour'
LIMIT 3;

-- Also fix the general scheduling logic to spread throughout business hours
-- Update remaining leads to be distributed across the next 8 business hours
UPDATE leads 
SET next_ai_send_at = now() + (
  -- Random distribution between 1-8 hours during business hours
  interval '1 hour' * (1 + floor(random() * 7))
),
updated_at = now()
WHERE ai_opt_in = true 
  AND ai_sequence_paused = false
  AND next_ai_send_at > now() + interval '8 hours';