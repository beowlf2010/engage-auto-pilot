
-- Add the missing profile_id column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN profile_id UUID REFERENCES public.profiles(id);

-- Add an index for better performance on profile_id lookups
CREATE INDEX IF NOT EXISTS idx_conversations_profile_id ON public.conversations(profile_id);
