-- Create tables for voice AI conversation analysis
CREATE TABLE public.call_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  recording_url TEXT,
  transcript_text TEXT,
  transcript_confidence DECIMAL(3,2),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  ai_analysis_status TEXT DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.call_conversation_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  transcript_id UUID NOT NULL,
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
  emotion_detected TEXT,
  intent_detected TEXT,
  topics_discussed JSONB,
  objections_raised JSONB,
  buying_signals JSONB,
  next_actions JSONB,
  conversation_summary TEXT,
  ai_recommendations TEXT,
  quality_score DECIMAL(3,2) CHECK (quality_score BETWEEN 0 AND 1),
  talk_time_ratio DECIMAL(3,2),
  engagement_level TEXT CHECK (engagement_level IN ('low', 'medium', 'high')),
  call_outcome_prediction TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.call_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('objection', 'buying_signal', 'concern', 'opportunity', 'follow_up')),
  insight_text TEXT NOT NULL,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  timestamp_in_call INTEGER, -- seconds into the call
  actionable BOOLEAN DEFAULT false,
  action_taken BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.real_time_call_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_log_id UUID NOT NULL,
  lead_id UUID NOT NULL,
  live_transcript TEXT,
  live_sentiment DECIMAL(3,2),
  live_insights JSONB,
  coaching_suggestions TEXT,
  escalation_needed BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  monitoring_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_call_transcriptions_call_log_id ON public.call_transcriptions(call_log_id);
CREATE INDEX idx_call_transcriptions_lead_id ON public.call_transcriptions(lead_id);
CREATE INDEX idx_call_transcriptions_status ON public.call_transcriptions(processing_status, ai_analysis_status);

CREATE INDEX idx_call_conversation_analysis_call_log_id ON public.call_conversation_analysis(call_log_id);
CREATE INDEX idx_call_conversation_analysis_lead_id ON public.call_conversation_analysis(lead_id);
CREATE INDEX idx_call_conversation_analysis_sentiment ON public.call_conversation_analysis(sentiment_score);

CREATE INDEX idx_call_insights_call_log_id ON public.call_insights(call_log_id);
CREATE INDEX idx_call_insights_lead_id ON public.call_insights(lead_id);
CREATE INDEX idx_call_insights_type ON public.call_insights(insight_type);
CREATE INDEX idx_call_insights_actionable ON public.call_insights(actionable);

CREATE INDEX idx_real_time_call_monitoring_call_log_id ON public.real_time_call_monitoring(call_log_id);
CREATE INDEX idx_real_time_call_monitoring_active ON public.real_time_call_monitoring(monitoring_active);

-- Enable RLS
ALTER TABLE public.call_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_call_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view call transcriptions" 
ON public.call_transcriptions FOR SELECT 
USING (true);

CREATE POLICY "Users can insert call transcriptions" 
ON public.call_transcriptions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update call transcriptions" 
ON public.call_transcriptions FOR UPDATE 
USING (true);

CREATE POLICY "Users can view call conversation analysis" 
ON public.call_conversation_analysis FOR SELECT 
USING (true);

CREATE POLICY "Users can insert call conversation analysis" 
ON public.call_conversation_analysis FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update call conversation analysis" 
ON public.call_conversation_analysis FOR UPDATE 
USING (true);

CREATE POLICY "Users can view call insights" 
ON public.call_insights FOR SELECT 
USING (true);

CREATE POLICY "Users can insert call insights" 
ON public.call_insights FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update call insights" 
ON public.call_insights FOR UPDATE 
USING (true);

CREATE POLICY "Users can view real time call monitoring" 
ON public.real_time_call_monitoring FOR SELECT 
USING (true);

CREATE POLICY "Users can insert real time call monitoring" 
ON public.real_time_call_monitoring FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update real time call monitoring" 
ON public.real_time_call_monitoring FOR UPDATE 
USING (true);

-- Foreign key constraints
ALTER TABLE public.call_transcriptions 
ADD CONSTRAINT fk_call_transcriptions_lead_id 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.call_conversation_analysis 
ADD CONSTRAINT fk_call_conversation_analysis_lead_id 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_call_conversation_analysis_transcript_id 
FOREIGN KEY (transcript_id) REFERENCES public.call_transcriptions(id) ON DELETE CASCADE;

ALTER TABLE public.call_insights 
ADD CONSTRAINT fk_call_insights_lead_id 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

ALTER TABLE public.real_time_call_monitoring 
ADD CONSTRAINT fk_real_time_call_monitoring_lead_id 
FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- Create function to trigger AI analysis when transcription is completed
CREATE OR REPLACE FUNCTION public.trigger_call_ai_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- When transcription is completed, trigger AI analysis
  IF NEW.processing_status = 'completed' AND OLD.processing_status != 'completed' THEN
    -- Update to start AI analysis
    UPDATE public.call_transcriptions 
    SET ai_analysis_status = 'processing'
    WHERE id = NEW.id;
    
    -- Insert notification for AI analysis queue
    INSERT INTO public.ai_notifications (
      lead_id,
      notification_type,
      title,
      message,
      urgency_level,
      ai_confidence,
      metadata
    ) VALUES (
      NEW.lead_id,
      'call_analysis_ready',
      'Call Analysis Ready',
      'Call transcription completed and ready for AI analysis',
      'medium',
      0.9,
      jsonb_build_object(
        'call_log_id', NEW.call_log_id,
        'transcript_id', NEW.id,
        'action', 'analyze_call_conversation'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_call_ai_analysis_on_transcription_complete
  AFTER UPDATE ON public.call_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_call_ai_analysis();

-- Create function to auto-generate insights from analysis
CREATE OR REPLACE FUNCTION public.generate_call_insights_from_analysis()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-generate actionable insights when analysis is completed
  IF NEW.buying_signals IS NOT NULL AND jsonb_array_length(NEW.buying_signals) > 0 THEN
    INSERT INTO public.call_insights (
      call_log_id, lead_id, insight_type, insight_text, confidence_score, actionable
    )
    SELECT 
      NEW.call_log_id,
      NEW.lead_id,
      'buying_signal',
      signal->>'text',
      (signal->>'confidence')::decimal,
      true
    FROM jsonb_array_elements(NEW.buying_signals) AS signal;
  END IF;
  
  IF NEW.objections_raised IS NOT NULL AND jsonb_array_length(NEW.objections_raised) > 0 THEN
    INSERT INTO public.call_insights (
      call_log_id, lead_id, insight_type, insight_text, confidence_score, actionable
    )
    SELECT 
      NEW.call_log_id,
      NEW.lead_id,
      'objection',
      objection->>'text',
      (objection->>'confidence')::decimal,
      true
    FROM jsonb_array_elements(NEW.objections_raised) AS objection;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating insights
CREATE TRIGGER trigger_generate_call_insights
  AFTER INSERT ON public.call_conversation_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_call_insights_from_analysis();