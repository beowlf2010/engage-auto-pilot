
-- Enable realtime for conversations table to get live updates
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add the conversations table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create an index on lead_id for efficient querying by webhooks
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON public.conversations(lead_id);

-- Create an index on phone numbers for efficient lead lookup
CREATE INDEX IF NOT EXISTS idx_phone_numbers_number ON public.phone_numbers(number);
