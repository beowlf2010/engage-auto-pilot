
-- First, let's add new status values to handle AI interaction states
-- Update leads that have been messaged by AI but haven't received replies
UPDATE leads 
SET status = 'engaged'
WHERE status = 'new' 
  AND ai_opt_in = true 
  AND ai_messages_sent > 0 
  AND (last_reply_at IS NULL OR last_reply_at < created_at);

-- Update leads that have received replies and are in active conversation
UPDATE leads 
SET status = 'engaged'
WHERE status = 'new' 
  AND ai_opt_in = true 
  AND ai_messages_sent > 0 
  AND last_reply_at IS NOT NULL 
  AND last_reply_at > created_at;

-- Keep leads as 'new' only if they haven't been contacted by AI yet
-- (These should be the ones that truly need attention)

-- Add a comment to track this migration
INSERT INTO public.kpis (date, leads_created, messages_sent, replies_in, cars_sold, gross_profit)
VALUES (CURRENT_DATE, 0, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;
