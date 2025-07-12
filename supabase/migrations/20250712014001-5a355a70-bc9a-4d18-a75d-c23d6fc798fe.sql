-- Add columns to conversations table for SMS delivery tracking
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS twilio_message_id text,
ADD COLUMN IF NOT EXISTS delivery_status_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sms_error_code text,
ADD COLUMN IF NOT EXISTS sms_error_message text;

-- Create index on twilio_message_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_conversations_twilio_message_id 
ON public.conversations(twilio_message_id) 
WHERE twilio_message_id IS NOT NULL;

-- Create AI queue health monitoring table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_queue_health (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  total_overdue integer NOT NULL DEFAULT 0,
  total_processing integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  queue_health_score integer NOT NULL DEFAULT 100
);