-- Create AI lead scoring table
CREATE TABLE public.ai_lead_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_factors JSONB DEFAULT '{}',
  engagement_level TEXT NOT NULL DEFAULT 'low' CHECK (engagement_level IN ('low', 'medium', 'high', 'very_high')),
  conversion_probability NUMERIC(3,2) DEFAULT 0.0 CHECK (conversion_probability >= 0.0 AND conversion_probability <= 1.0),
  last_scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Create conversation analysis table
CREATE TABLE public.conversation_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sentiment_score NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  sentiment_label TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  intent_categories TEXT[] DEFAULT '{}',
  key_phrases TEXT[] DEFAULT '{}',
  urgency_level TEXT NOT NULL DEFAULT 'medium' CHECK (urgency_level IN ('low', 'medium', 'high', 'critical')),
  response_quality_score NUMERIC(3,2) DEFAULT 0.0 CHECK (response_quality_score >= 0.0 AND response_quality_score <= 1.0),
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI insights table
CREATE TABLE public.ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('lead_behavior', 'inventory_trend', 'conversation_pattern', 'performance_metric')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  insight_data JSONB DEFAULT '{}',
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  impact_level TEXT NOT NULL DEFAULT 'medium' CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
  actionable BOOLEAN NOT NULL DEFAULT false,
  action_recommendations JSONB DEFAULT '[]',
  applicable_leads UUID[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory predictions table
CREATE TABLE public.inventory_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('days_to_sell', 'price_optimization', 'demand_forecast')),
  predicted_value NUMERIC,
  confidence_level NUMERIC(3,2) NOT NULL DEFAULT 0.0 CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  prediction_factors JSONB DEFAULT '{}',
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_outcome NUMERIC,
  accuracy_score NUMERIC(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead engagement metrics table
CREATE TABLE public.lead_engagement_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  total_interactions INTEGER NOT NULL DEFAULT 0,
  response_rate NUMERIC(3,2) DEFAULT 0.0 CHECK (response_rate >= 0.0 AND response_rate <= 1.0),
  avg_response_time_hours NUMERIC,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  engagement_trend TEXT NOT NULL DEFAULT 'stable' CHECK (engagement_trend IN ('increasing', 'decreasing', 'stable')),
  interaction_quality_score NUMERIC(3,2) DEFAULT 0.0 CHECK (interaction_quality_score >= 0.0 AND interaction_quality_score <= 1.0),
  preferred_contact_method TEXT,
  best_contact_times INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id)
);

-- Create indexes for performance
CREATE INDEX idx_ai_lead_scores_score ON public.ai_lead_scores(score DESC);
CREATE INDEX idx_ai_lead_scores_engagement ON public.ai_lead_scores(engagement_level);
CREATE INDEX idx_conversation_analysis_sentiment ON public.conversation_analysis(sentiment_label, sentiment_score);
CREATE INDEX idx_conversation_analysis_urgency ON public.conversation_analysis(urgency_level);
CREATE INDEX idx_ai_insights_type_impact ON public.ai_insights(insight_type, impact_level);
CREATE INDEX idx_ai_insights_actionable ON public.ai_insights(actionable) WHERE actionable = true;
CREATE INDEX idx_inventory_predictions_type ON public.inventory_predictions(prediction_type);
CREATE INDEX idx_inventory_predictions_valid ON public.inventory_predictions(valid_until) WHERE valid_until > now();
CREATE INDEX idx_lead_engagement_trend ON public.lead_engagement_metrics(engagement_trend);

-- Enable RLS on all tables
ALTER TABLE public.ai_lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Authenticated users can manage ai_lead_scores" ON public.ai_lead_scores FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage conversation_analysis" ON public.conversation_analysis FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage ai_insights" ON public.ai_insights FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage inventory_predictions" ON public.inventory_predictions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage lead_engagement_metrics" ON public.lead_engagement_metrics FOR ALL USING (auth.uid() IS NOT NULL);

-- Create function to calculate lead score
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  base_score INTEGER := 50;
  final_score INTEGER;
  days_since_creation INTEGER;
  conversation_count INTEGER;
  response_rate NUMERIC;
  last_activity_days INTEGER;
BEGIN
  -- Get lead metrics
  SELECT 
    EXTRACT(DAY FROM (now() - created_at)),
    EXTRACT(DAY FROM (now() - COALESCE(last_reply_at, created_at)))
  INTO days_since_creation, last_activity_days
  FROM public.leads WHERE id = p_lead_id;
  
  -- Get conversation metrics
  SELECT 
    COUNT(*) as total_conversations,
    CASE 
      WHEN COUNT(*) FILTER (WHERE direction = 'out') > 0 
      THEN COUNT(*) FILTER (WHERE direction = 'in')::NUMERIC / COUNT(*) FILTER (WHERE direction = 'out')
      ELSE 0 
    END as response_rate
  INTO conversation_count, response_rate
  FROM public.conversations WHERE lead_id = p_lead_id;
  
  -- Calculate score adjustments
  -- Recent activity bonus
  IF last_activity_days <= 1 THEN
    base_score := base_score + 20;
  ELSIF last_activity_days <= 7 THEN
    base_score := base_score + 10;
  ELSIF last_activity_days > 30 THEN
    base_score := base_score - 20;
  END IF;
  
  -- Engagement bonus
  IF conversation_count > 10 THEN
    base_score := base_score + 15;
  ELSIF conversation_count > 5 THEN
    base_score := base_score + 10;
  END IF;
  
  -- Response rate bonus
  IF response_rate > 0.7 THEN
    base_score := base_score + 15;
  ELSIF response_rate > 0.4 THEN
    base_score := base_score + 8;
  ELSIF response_rate < 0.2 AND conversation_count > 3 THEN
    base_score := base_score - 10;
  END IF;
  
  -- Ensure score is within bounds
  final_score := GREATEST(0, LEAST(100, base_score));
  
  RETURN final_score;
END;
$$;

-- Create function to update lead engagement metrics
CREATE OR REPLACE FUNCTION public.update_lead_engagement_metrics(p_lead_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  total_conversations INTEGER;
  response_rate_calc NUMERIC;
  avg_response_hours NUMERIC;
  last_interaction TIMESTAMP WITH TIME ZONE;
  quality_score NUMERIC := 0.5;
BEGIN
  -- Calculate metrics from conversations
  SELECT 
    COUNT(*) as total,
    CASE 
      WHEN COUNT(*) FILTER (WHERE direction = 'out') > 0 
      THEN COUNT(*) FILTER (WHERE direction = 'in')::NUMERIC / COUNT(*) FILTER (WHERE direction = 'out')
      ELSE 0 
    END as rate,
    AVG(EXTRACT(EPOCH FROM (sent_at - LAG(sent_at) OVER (ORDER BY sent_at))) / 3600) as avg_hours,
    MAX(sent_at) as last_msg
  INTO total_conversations, response_rate_calc, avg_response_hours, last_interaction
  FROM public.conversations 
  WHERE lead_id = p_lead_id;
  
  -- Upsert engagement metrics
  INSERT INTO public.lead_engagement_metrics (
    lead_id, total_interactions, response_rate, avg_response_time_hours,
    last_interaction_at, interaction_quality_score
  )
  VALUES (
    p_lead_id, total_conversations, response_rate_calc, avg_response_hours,
    last_interaction, quality_score
  )
  ON CONFLICT (lead_id) 
  DO UPDATE SET
    total_interactions = EXCLUDED.total_interactions,
    response_rate = EXCLUDED.response_rate,
    avg_response_time_hours = EXCLUDED.avg_response_time_hours,
    last_interaction_at = EXCLUDED.last_interaction_at,
    interaction_quality_score = EXCLUDED.interaction_quality_score,
    updated_at = now();
END;
$$;

-- Create trigger to auto-update lead scores when conversations change
CREATE OR REPLACE FUNCTION public.trigger_lead_score_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update lead score
  INSERT INTO public.ai_lead_scores (lead_id, score, last_scored_at)
  VALUES (
    COALESCE(NEW.lead_id, OLD.lead_id), 
    public.calculate_lead_score(COALESCE(NEW.lead_id, OLD.lead_id)),
    now()
  )
  ON CONFLICT (lead_id) 
  DO UPDATE SET
    score = public.calculate_lead_score(ai_lead_scores.lead_id),
    last_scored_at = now(),
    updated_at = now();
  
  -- Update engagement metrics
  PERFORM public.update_lead_engagement_metrics(COALESCE(NEW.lead_id, OLD.lead_id));
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_score_update_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_lead_score_update();

-- Create function to generate AI insights
CREATE OR REPLACE FUNCTION public.generate_daily_ai_insights()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  low_engagement_count INTEGER;
  high_response_leads INTEGER;
  overdue_inventory INTEGER;
BEGIN
  -- Clear old insights (keep last 30 days)
  DELETE FROM public.ai_insights 
  WHERE created_at < now() - interval '30 days';
  
  -- Insight: Low engagement leads needing attention
  SELECT COUNT(*) INTO low_engagement_count
  FROM public.ai_lead_scores als
  JOIN public.leads l ON als.lead_id = l.id
  WHERE als.score < 30 AND l.status IN ('new', 'engaged')
  AND l.created_at > now() - interval '14 days';
  
  IF low_engagement_count > 5 THEN
    INSERT INTO public.ai_insights (
      insight_type, title, description, confidence_score, impact_level, actionable
    ) VALUES (
      'lead_behavior',
      'Low Engagement Alert',
      format('%s leads have low engagement scores and may need immediate attention', low_engagement_count),
      0.85,
      'high',
      true
    );
  END IF;
  
  -- Insight: High-response leads ready for follow-up
  SELECT COUNT(*) INTO high_response_leads
  FROM public.lead_engagement_metrics lem
  JOIN public.leads l ON lem.lead_id = l.id
  WHERE lem.response_rate > 0.6 AND l.status = 'engaged'
  AND lem.last_interaction_at > now() - interval '3 days';
  
  IF high_response_leads > 0 THEN
    INSERT INTO public.ai_insights (
      insight_type, title, description, confidence_score, impact_level, actionable
    ) VALUES (
      'lead_behavior',
      'Hot Leads Ready for Action',
      format('%s leads have high response rates and recent activity - perfect for immediate follow-up', high_response_leads),
      0.9,
      'high',
      true
    );
  END IF;
  
  -- Insight: Inventory sitting too long
  SELECT COUNT(*) INTO overdue_inventory
  FROM public.inventory
  WHERE status = 'available' 
  AND days_in_inventory > 60;
  
  IF overdue_inventory > 10 THEN
    INSERT INTO public.ai_insights (
      insight_type, title, description, confidence_score, impact_level, actionable
    ) VALUES (
      'inventory_trend',
      'Aging Inventory Alert',
      format('%s vehicles have been in inventory over 60 days - consider pricing adjustments', overdue_inventory),
      0.8,
      'medium',
      true
    );
  END IF;
END;
$$;