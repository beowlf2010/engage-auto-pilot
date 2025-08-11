-- Enable RLS on conversations (safe if already enabled)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Allow assigned salesperson or managers/admins to mark incoming messages as read
-- This policy permits updates on rows where the user is either the assigned salesperson
-- for the lead or has an elevated role. It is scoped to incoming messages.
CREATE POLICY "conversations_mark_read_incoming"
ON public.conversations
FOR UPDATE
USING (
  direction = 'in'
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = conversations.lead_id
      AND (
        l.salesperson_id = auth.uid()
        OR auth.uid() IN (
          SELECT user_id FROM public.user_roles WHERE role IN ('admin','manager')
        )
      )
  )
)
WITH CHECK (direction = 'in');