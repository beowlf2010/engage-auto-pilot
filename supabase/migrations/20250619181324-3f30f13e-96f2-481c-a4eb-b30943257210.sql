
-- Add unique constraint on lead_id to conversation_summaries table
-- This will allow the onConflict: 'lead_id' clause to work in the conversation summary service
ALTER TABLE public.conversation_summaries 
ADD CONSTRAINT conversation_summaries_lead_id_unique UNIQUE (lead_id);
