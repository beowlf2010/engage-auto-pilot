-- Fix existing leads that are stuck in 'new' status but should be 'engaged'
-- These are leads that have ai_opt_in = true or have had AI messages sent but are still marked as 'new'

UPDATE leads 
SET status = 'engaged',
    updated_at = now()
WHERE status = 'new' 
  AND (ai_opt_in = true OR ai_messages_sent > 0);

-- Add a trigger to automatically transition lead status when ai_opt_in is enabled
CREATE OR REPLACE FUNCTION handle_ai_optin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_opt_in = true AND (OLD.ai_opt_in IS NULL OR OLD.ai_opt_in = false) THEN
    PERFORM schedule_next_touch(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ai_opt_in changes (only if it doesn't exist)
DROP TRIGGER IF EXISTS on_ai_optin_change ON leads;
CREATE TRIGGER on_ai_optin_change
  AFTER UPDATE OF ai_opt_in ON leads
  FOR EACH ROW
  EXECUTE FUNCTION handle_ai_optin();