-- Mark all unread conversations as read for clean dashboard
UPDATE public.conversations 
SET read_at = now() 
WHERE direction = 'in' 
AND read_at IS NULL;