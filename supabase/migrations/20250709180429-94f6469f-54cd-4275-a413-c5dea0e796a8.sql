-- Fix ai_conversation_notes constraint issues
-- First, let's check and fix any invalid note_type values

-- Update any invalid note_type values to a valid default
UPDATE public.ai_conversation_notes 
SET note_type = 'inventory_discussion' 
WHERE note_type IS NULL OR note_type NOT IN ('inventory_discussion', 'follow_up', 'appointment_note', 'general_note', 'vehicle_inquiry');

-- Add a proper check constraint for note_type values
ALTER TABLE public.ai_conversation_notes 
DROP CONSTRAINT IF EXISTS ai_conversation_notes_note_type_check;

ALTER TABLE public.ai_conversation_notes 
ADD CONSTRAINT ai_conversation_notes_note_type_check 
CHECK (note_type IN ('inventory_discussion', 'follow_up', 'appointment_note', 'general_note', 'vehicle_inquiry'));

-- Ensure the table has proper RLS policies
ALTER TABLE public.ai_conversation_notes ENABLE ROW LEVEL SECURITY;

-- Fix any RLS policy issues
DROP POLICY IF EXISTS "Allow all operations on ai_conversation_notes" ON public.ai_conversation_notes;

CREATE POLICY "Users can manage conversation notes" 
ON public.ai_conversation_notes 
FOR ALL 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);