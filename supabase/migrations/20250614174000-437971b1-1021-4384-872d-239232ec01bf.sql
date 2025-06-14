
-- Create email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email conversations table (similar to conversations but for emails)
CREATE TABLE public.email_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  template_id UUID REFERENCES public.email_templates(id),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  email_error TEXT,
  resend_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create email settings table
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  signature TEXT,
  default_from_name TEXT,
  default_from_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_campaigns
CREATE POLICY "Users can view campaigns they created or if admin/manager" 
  ON public.email_campaigns 
  FOR SELECT 
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Users can create campaigns" 
  ON public.email_campaigns 
  FOR INSERT 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own campaigns or if admin/manager" 
  ON public.email_campaigns 
  FOR UPDATE 
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- RLS policies for email_templates
CREATE POLICY "Users can view all active templates" 
  ON public.email_templates 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can manage templates" 
  ON public.email_templates 
  FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS policies for email_conversations
CREATE POLICY "Users can view email conversations for their leads" 
  ON public.email_conversations 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
    )
  );

CREATE POLICY "Users can create email conversations" 
  ON public.email_conversations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_id 
      AND (l.salesperson_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')))
    )
  );

-- RLS policies for email_settings
CREATE POLICY "Users can manage their own email settings" 
  ON public.email_settings 
  FOR ALL 
  USING (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_email_conversations_lead_id ON public.email_conversations(lead_id);
CREATE INDEX idx_email_conversations_sent_at ON public.email_conversations(sent_at);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_campaigns_created_by ON public.email_campaigns(created_by);

-- Insert some default email templates
INSERT INTO public.email_templates (name, subject, content, category) VALUES
('Welcome Email', 'Welcome to our dealership!', '<h1>Welcome!</h1><p>Thank you for your interest in {{vehicle_interest}}. We''re excited to help you find the perfect vehicle.</p><p>Best regards,<br>{{salesperson_name}}</p>', 'welcome'),
('Follow Up', 'Following up on your vehicle inquiry', '<p>Hi {{lead_first_name}},</p><p>I wanted to follow up on your interest in {{vehicle_interest}}. Do you have any questions I can answer?</p><p>Best regards,<br>{{salesperson_name}}</p>', 'follow_up'),
('Vehicle Available', 'Great news - we have your vehicle!', '<p>Hi {{lead_first_name}},</p><p>Great news! We have a {{vehicle_year}} {{vehicle_make}} {{vehicle_model}} that matches what you''re looking for.</p><p>Would you like to schedule a time to see it?</p><p>Best regards,<br>{{salesperson_name}}</p>', 'inventory'),
('Thank You', 'Thank you for visiting us', '<p>Hi {{lead_first_name}},</p><p>Thank you for taking the time to visit our dealership. It was great meeting you!</p><p>Please let me know if you have any questions about the vehicles we discussed.</p><p>Best regards,<br>{{salesperson_name}}</p>', 'thank_you');
