-- Create a special AI system profile for automated messages
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ai-system@internal.system',
  'AI',
  'System',
  'admin'
) ON CONFLICT (id) DO NOTHING;

-- Update any existing conversations with null profile_id that are AI generated to use the AI system profile
UPDATE public.conversations 
SET profile_id = '00000000-0000-0000-0000-000000000001'
WHERE profile_id IS NULL 
  AND ai_generated = true;