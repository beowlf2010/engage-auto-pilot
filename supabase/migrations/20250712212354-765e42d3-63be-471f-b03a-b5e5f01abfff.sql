-- Fix the update_lead_engagement_metrics function to resolve SQL error
-- The issue was using LAG() window function inside AVG() aggregate function
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
  -- Calculate basic metrics from conversations
  SELECT 
    COUNT(*) as total,
    CASE 
      WHEN COUNT(*) FILTER (WHERE direction = 'out') > 0 
      THEN COUNT(*) FILTER (WHERE direction = 'in')::NUMERIC / COUNT(*) FILTER (WHERE direction = 'out')
      ELSE 0 
    END as rate,
    MAX(sent_at) as last_msg
  INTO total_conversations, response_rate_calc, last_interaction
  FROM public.conversations 
  WHERE lead_id = p_lead_id;
  
  -- Calculate average response time using a CTE to properly handle the window function
  WITH conversation_times AS (
    SELECT 
      sent_at,
      LAG(sent_at) OVER (ORDER BY sent_at) as prev_sent_at
    FROM public.conversations 
    WHERE lead_id = p_lead_id
    ORDER BY sent_at
  ),
  time_differences AS (
    SELECT 
      EXTRACT(EPOCH FROM (sent_at - prev_sent_at)) / 3600 as hours_diff
    FROM conversation_times
    WHERE prev_sent_at IS NOT NULL
  )
  SELECT AVG(hours_diff) INTO avg_response_hours
  FROM time_differences;
  
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