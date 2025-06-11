
-- Create table for AI message templates with multiple variants per stage
CREATE TABLE public.ai_message_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage text NOT NULL,
  variant_name text NOT NULL,
  template text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  response_rate numeric DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(stage, variant_name)
);

-- Create table for tracking message analytics and performance
CREATE TABLE public.ai_message_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  template_id uuid REFERENCES public.ai_message_templates(id),
  message_content text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone,
  response_time_hours numeric,
  inventory_mentioned jsonb,
  message_stage text NOT NULL,
  day_of_week integer,
  hour_of_day integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for dynamic scheduling configuration
CREATE TABLE public.ai_schedule_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name text NOT NULL UNIQUE,
  day_offset integer NOT NULL,
  messages_per_day integer NOT NULL DEFAULT 1,
  preferred_hours integer[] DEFAULT ARRAY[9, 14, 18],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table for tracking individual lead response patterns
CREATE TABLE public.lead_response_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL UNIQUE,
  best_response_hours integer[],
  best_response_days integer[],
  avg_response_time_hours numeric,
  total_messages_sent integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  last_response_at timestamp with time zone,
  preferred_content_types text[],
  inventory_responsiveness jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default aggressive schedule configuration
INSERT INTO public.ai_schedule_config (stage_name, day_offset, messages_per_day, preferred_hours) VALUES
-- Day 1: 3 aggressive messages
('day_1_morning', 0, 1, ARRAY[9]),
('day_1_afternoon', 0, 1, ARRAY[14]),
('day_1_evening', 0, 1, ARRAY[18]),
-- Days 2-7: 2 messages per day
('week_1_morning', 1, 1, ARRAY[9]),
('week_1_evening', 1, 1, ARRAY[18]),
-- Week 2: 1 message per day
('week_2_daily', 8, 1, ARRAY[10]),
-- Month 2-3: Skip days pattern
('month_2_sparse', 15, 1, ARRAY[10]),
('month_3_sparse', 45, 1, ARRAY[10]);

-- Insert default message templates with multiple variants
INSERT INTO public.ai_message_templates (stage, variant_name, template) VALUES
-- Day 1 templates
('day_1_morning', 'friendly_intro', 'Hi {firstName}! I''m Finn from the dealership. I see you''re interested in {vehicleInterest}. {inventoryMessage} Would you like to schedule a time to see it?'),
('day_1_morning', 'urgent_intro', 'Hi {firstName}! Thanks for your interest in {vehicleInterest}. {inventoryMessage} This one''s getting a lot of attention - when can you come in?'),
('day_1_afternoon', 'value_prop', 'Hi {firstName}, just wanted to follow up on {vehicleInterest}. {inventoryMessage} {pricingMessage} We have great financing options available too!'),
('day_1_afternoon', 'inventory_focus', 'Hi {firstName}! {inventoryMessage} {availabilityMessage} Perfect time to come see it before someone else does!'),
('day_1_evening', 'closing_push', 'Hi {firstName}, hope you had a great day! Still thinking about that {vehicleInterest}? {inventoryMessage} Would tomorrow work for a quick test drive?'),
('day_1_evening', 'soft_close', 'Evening {firstName}! Just wanted to touch base about {vehicleInterest}. {inventoryMessage} Any questions I can help answer?'),

-- Week 1 follow-ups
('week_1_morning', 'check_in', 'Good morning {firstName}! How are you feeling about the {vehicleInterest}? {inventoryMessage} Happy to answer any questions!'),
('week_1_evening', 'urgency_soft', 'Hi {firstName}, {inventoryMessage} {availabilityMessage} Still a great time to come take a look!'),

-- Week 2 messages
('week_2_daily', 'gentle_follow', 'Hi {firstName}, {memoryMessage} {inventoryMessage} We''re here when you''re ready!'),
('week_2_daily', 'value_reminder', 'Hi {firstName}, {inventoryMessage} {pricingMessage} Great deals like this don''t last long!'),

-- Month 2-3 sparse messages
('month_2_sparse', 'check_in_long', 'Hi {firstName}, hope you''re doing well! {memoryMessage} {inventoryMessage} Still here to help when you''re ready!'),
('month_3_sparse', 'final_touch', 'Hi {firstName}, {inventoryMessage} Just wanted you to know we''re still here if you need anything!');

-- Create indexes for performance
CREATE INDEX idx_ai_message_analytics_lead_id ON public.ai_message_analytics(lead_id);
CREATE INDEX idx_ai_message_analytics_sent_at ON public.ai_message_analytics(sent_at);
CREATE INDEX idx_ai_message_analytics_stage ON public.ai_message_analytics(message_stage);
CREATE INDEX idx_lead_response_patterns_lead_id ON public.lead_response_patterns(lead_id);
CREATE INDEX idx_ai_schedule_config_stage ON public.ai_schedule_config(stage_name);

-- Add new columns to leads table for advanced AI tracking
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_messages_sent integer DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_last_message_stage text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_sequence_paused boolean DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_pause_reason text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_resume_at timestamp with time zone;
