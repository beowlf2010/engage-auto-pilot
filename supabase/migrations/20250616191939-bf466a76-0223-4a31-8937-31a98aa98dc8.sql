
-- Add email automation fields to the leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_opt_in boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sequence_stage text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sequence_paused boolean DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_email_send_at timestamp with time zone;

-- Create email conversation analysis table for storing email insights
CREATE TABLE IF NOT EXISTS email_conversation_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email_conversation_id uuid NOT NULL REFERENCES email_conversations(id) ON DELETE CASCADE,
  sentiment text NOT NULL DEFAULT 'neutral',
  intent text[] DEFAULT '{}',
  key_phrases text[] DEFAULT '{}',
  urgency_level text NOT NULL DEFAULT 'medium',
  analyzed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE email_conversation_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for email conversation analysis
CREATE POLICY "Users can manage email conversation analysis" 
  ON email_conversation_analysis 
  FOR ALL 
  USING (true);
