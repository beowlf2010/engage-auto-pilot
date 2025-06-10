
-- Add SMS tracking columns to conversations table
ALTER TABLE public.conversations 
ADD COLUMN sms_status text DEFAULT 'pending',
ADD COLUMN twilio_message_id text,
ADD COLUMN sms_error text;

-- Add index for efficient querying by SMS status
CREATE INDEX idx_conversations_sms_status ON public.conversations(sms_status);
