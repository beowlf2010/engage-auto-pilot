-- Create a function to insert system-generated conversations
-- This function bypasses RLS and is used for AI automation
CREATE OR REPLACE FUNCTION public.create_system_conversation(conversation_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Insert the conversation record
  INSERT INTO public.conversations (
    lead_id,
    profile_id,
    body,
    direction,
    sent_at,
    ai_generated,
    sms_status
  )
  VALUES (
    (conversation_data->>'lead_id')::uuid,
    CASE 
      WHEN conversation_data->>'profile_id' = 'null' OR conversation_data->>'profile_id' IS NULL 
      THEN NULL 
      ELSE (conversation_data->>'profile_id')::uuid 
    END,
    conversation_data->>'body',
    conversation_data->>'direction',
    (conversation_data->>'sent_at')::timestamp with time zone,
    (conversation_data->>'ai_generated')::boolean,
    conversation_data->>'sms_status'
  )
  RETURNING id INTO conversation_id;
  
  RETURN conversation_id;
END;
$$;