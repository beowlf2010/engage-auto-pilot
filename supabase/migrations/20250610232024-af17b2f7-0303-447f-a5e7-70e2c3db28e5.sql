
-- Change the default value for ai_opt_in to false
ALTER TABLE leads ALTER COLUMN ai_opt_in SET DEFAULT false;

-- Update any existing leads that have ai_opt_in as true to false (optional - remove this line if you want to keep existing settings)
UPDATE leads SET ai_opt_in = false WHERE ai_opt_in = true;
