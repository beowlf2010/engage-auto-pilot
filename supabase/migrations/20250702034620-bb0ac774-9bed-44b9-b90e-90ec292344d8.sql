-- Enable real-time updates for conversations table
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add conversations to the realtime publication  
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Also enable real-time for leads table
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;