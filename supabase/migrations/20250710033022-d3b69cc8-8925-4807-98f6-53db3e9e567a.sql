-- Create real-time notifications system
CREATE TABLE public.ai_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'high_score', 'churn_risk', 'inventory_match', 'engagement_opportunity'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  ai_confidence NUMERIC NOT NULL DEFAULT 0.0,
  metadata JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES public.profiles(id)
);

-- Create predictive churn analysis table
CREATE TABLE public.ai_churn_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  churn_probability NUMERIC NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
  risk_level TEXT NOT NULL DEFAULT 'low', -- 'critical', 'high', 'medium', 'low'
  contributing_factors JSONB DEFAULT '[]',
  recommended_interventions JSONB DEFAULT '[]',
  prediction_confidence NUMERIC NOT NULL DEFAULT 0.0,
  days_until_predicted_churn INTEGER,
  last_engagement_score NUMERIC DEFAULT 0.0,
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  actual_outcome TEXT, -- 'churned', 'retained', 'converted'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI-powered inventory matching table
CREATE TABLE public.ai_inventory_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL DEFAULT 0.0, -- 0.0 to 1.0
  match_reasons JSONB DEFAULT '[]',
  personalized_pitch TEXT,
  confidence_level NUMERIC NOT NULL DEFAULT 0.0,
  lead_preferences JSONB DEFAULT '{}',
  vehicle_highlights JSONB DEFAULT '[]',
  pricing_strategy JSONB DEFAULT '{}',
  presentation_order INTEGER DEFAULT 0,
  match_type TEXT NOT NULL DEFAULT 'preference', -- 'preference', 'budget', 'lifestyle', 'trade_match'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shown_to_lead_at TIMESTAMP WITH TIME ZONE,
  lead_interaction TEXT, -- 'interested', 'not_interested', 'scheduled_viewing'
  UNIQUE(lead_id, inventory_id)
);

-- Create automated message generation tracking
CREATE TABLE public.ai_generated_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- 'follow_up', 'inventory_match', 'churn_prevention', 'engagement'
  generated_content TEXT NOT NULL,
  personalization_factors JSONB DEFAULT '{}',
  tone_style TEXT NOT NULL DEFAULT 'professional', -- 'professional', 'casual', 'urgent', 'warm'
  ai_confidence NUMERIC NOT NULL DEFAULT 0.0,
  human_approved BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN DEFAULT false,
  response_sentiment TEXT, -- 'positive', 'negative', 'neutral'
  effectiveness_score NUMERIC,
  template_used TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_by UUID REFERENCES public.profiles(id),
  rejected_reason TEXT
);

-- Create indexes for performance
CREATE INDEX idx_ai_notifications_lead_id ON public.ai_notifications(lead_id);
CREATE INDEX idx_ai_notifications_type_urgency ON public.ai_notifications(notification_type, urgency_level);
CREATE INDEX idx_ai_notifications_unread ON public.ai_notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_ai_churn_predictions_lead_id ON public.ai_churn_predictions(lead_id);
CREATE INDEX idx_ai_churn_predictions_risk ON public.ai_churn_predictions(risk_level, churn_probability);
CREATE INDEX idx_ai_inventory_matches_lead_id ON public.ai_inventory_matches(lead_id);
CREATE INDEX idx_ai_inventory_matches_score ON public.ai_inventory_matches(match_score DESC);
CREATE INDEX idx_ai_generated_messages_lead_id ON public.ai_generated_messages(lead_id);
CREATE INDEX idx_ai_generated_messages_pending ON public.ai_generated_messages(human_approved) WHERE human_approved = false;

-- Enable RLS policies
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_churn_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_inventory_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_notifications
CREATE POLICY "Users can view notifications for their leads" ON public.ai_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = ai_notifications.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

CREATE POLICY "Users can update notifications for their leads" ON public.ai_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = ai_notifications.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create RLS policies for ai_churn_predictions
CREATE POLICY "Users can view churn predictions for their leads" ON public.ai_churn_predictions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = ai_churn_predictions.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create RLS policies for ai_inventory_matches
CREATE POLICY "Users can view inventory matches for their leads" ON public.ai_inventory_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = ai_inventory_matches.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create RLS policies for ai_generated_messages
CREATE POLICY "Users can manage generated messages for their leads" ON public.ai_generated_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = ai_generated_messages.lead_id 
      AND (l.salesperson_id = auth.uid() OR auth.uid() IN (
        SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'manager')
      ))
    )
  );

-- Create functions for real-time triggers
CREATE OR REPLACE FUNCTION public.notify_ai_insights()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger real-time notification for high-priority AI insights
  IF NEW.urgency_level IN ('critical', 'high') THEN
    PERFORM pg_notify('ai_insights', json_build_object(
      'id', NEW.id,
      'lead_id', NEW.lead_id,
      'type', NEW.notification_type,
      'urgency', NEW.urgency_level,
      'title', NEW.title
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
CREATE TRIGGER ai_insights_notification_trigger
  AFTER INSERT ON public.ai_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ai_insights();

-- Enable realtime for the tables
ALTER TABLE public.ai_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.ai_churn_predictions REPLICA IDENTITY FULL;
ALTER TABLE public.ai_inventory_matches REPLICA IDENTITY FULL;
ALTER TABLE public.ai_generated_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_churn_predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_inventory_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_messages;