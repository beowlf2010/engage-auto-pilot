-- Enable full replica identity for better real-time updates
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;