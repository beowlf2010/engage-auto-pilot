-- Fix the AI stage for the test leads - change from 'scheduled' to 'active'
UPDATE leads 
SET ai_stage = 'active',
    updated_at = now()
WHERE ai_opt_in = true 
AND ai_stage = 'scheduled';