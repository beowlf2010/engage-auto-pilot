
-- Create table for enhanced behavioral triggers
CREATE TABLE public.enhanced_behavioral_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('website_visit', 'email_open', 'link_click', 'page_view', 'search_activity', 'price_alert', 'inventory_match')),
  trigger_data JSONB DEFAULT '{}',
  trigger_score INTEGER NOT NULL DEFAULT 0,
  urgency_level TEXT NOT NULL DEFAULT 'low' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for website activities
CREATE TABLE public.website_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('vehicle_detail', 'inventory_list', 'financing', 'contact', 'homepage')),
  time_spent INTEGER NOT NULL DEFAULT 0,
  actions_taken TEXT[] DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for lead personalities
CREATE TABLE public.lead_personalities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  communication_style TEXT NOT NULL DEFAULT 'casual' CHECK (communication_style IN ('formal', 'casual', 'enthusiastic', 'direct')),
  response_preference TEXT NOT NULL DEFAULT 'immediate' CHECK (response_preference IN ('immediate', 'considered', 'research_oriented')),
  interest_level TEXT NOT NULL DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
  price_sensitivity TEXT NOT NULL DEFAULT 'medium' CHECK (price_sensitivity IN ('high', 'medium', 'low')),
  decision_speed TEXT NOT NULL DEFAULT 'moderate' CHECK (decision_speed IN ('fast', 'moderate', 'slow')),
  preferred_contact_method TEXT NOT NULL DEFAULT 'sms' CHECK (preferred_contact_method IN ('sms', 'email', 'phone')),
  personality_score INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for lead contact timing
CREATE TABLE public.lead_contact_timing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE UNIQUE,
  best_contact_hours INTEGER[] DEFAULT '{}',
  best_contact_days INTEGER[] DEFAULT '{}',
  timezone TEXT DEFAULT 'America/New_York',
  response_delay_pattern INTEGER DEFAULT 24,
  last_optimal_contact TIMESTAMP WITH TIME ZONE
);

-- Create table for AI trigger messages
CREATE TABLE public.ai_trigger_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES public.enhanced_behavioral_triggers(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'medium',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for better performance
CREATE INDEX idx_enhanced_behavioral_triggers_lead_id ON public.enhanced_behavioral_triggers(lead_id);
CREATE INDEX idx_enhanced_behavioral_triggers_processed ON public.enhanced_behavioral_triggers(processed);
CREATE INDEX idx_enhanced_behavioral_triggers_urgency ON public.enhanced_behavioral_triggers(urgency_level);
CREATE INDEX idx_website_activities_lead_id ON public.website_activities(lead_id);
CREATE INDEX idx_website_activities_timestamp ON public.website_activities(timestamp);
CREATE INDEX idx_lead_personalities_lead_id ON public.lead_personalities(lead_id);
CREATE INDEX idx_lead_contact_timing_lead_id ON public.lead_contact_timing(lead_id);
CREATE INDEX idx_ai_trigger_messages_lead_id ON public.ai_trigger_messages(lead_id);

-- Enable Row Level Security
ALTER TABLE public.enhanced_behavioral_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contact_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trigger_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now, can be refined later)
CREATE POLICY "Allow all operations on enhanced_behavioral_triggers" ON public.enhanced_behavioral_triggers FOR ALL USING (true);
CREATE POLICY "Allow all operations on website_activities" ON public.website_activities FOR ALL USING (true);
CREATE POLICY "Allow all operations on lead_personalities" ON public.lead_personalities FOR ALL USING (true);
CREATE POLICY "Allow all operations on lead_contact_timing" ON public.lead_contact_timing FOR ALL USING (true);
CREATE POLICY "Allow all operations on ai_trigger_messages" ON public.ai_trigger_messages FOR ALL USING (true);
