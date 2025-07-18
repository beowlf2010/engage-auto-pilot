
-- Add dealership and salesperson settings for AI message identification

-- Insert dealership and salesperson settings
INSERT INTO public.settings (key, value, description) VALUES
('DEALERSHIP_NAME', 'Baldwin Chevrolet Buick GMC', 'Name of the dealership for AI message identification'),
('DEFAULT_SALESPERSON_NAME', 'Mike Johnson', 'Default salesperson name for AI messages when not specified'),
('DEALERSHIP_LOCATION', 'Gulf Shores, AL', 'Dealership location for context in AI messages'),
('DEALERSHIP_PHONE', '(251) 968-3000', 'Main dealership phone number for AI messages')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Add a function to get dealership context for AI messages
CREATE OR REPLACE FUNCTION get_dealership_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  context jsonb;
BEGIN
  SELECT jsonb_object_agg(key, value)
  INTO context
  FROM settings
  WHERE key IN ('DEALERSHIP_NAME', 'DEFAULT_SALESPERSON_NAME', 'DEALERSHIP_LOCATION', 'DEALERSHIP_PHONE');
  
  RETURN COALESCE(context, '{}'::jsonb);
END;
$$;

-- Add a column to conversations to track if it's an initial contact
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS is_initial_contact boolean DEFAULT false;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_initial_contact 
ON public.conversations(lead_id, is_initial_contact);
