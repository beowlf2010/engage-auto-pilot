-- CRITICAL FIX: Force drop and recreate SECURITY DEFINER views
-- This addresses persistent security linter warnings

-- Drop views completely with CASCADE to handle dependencies
DROP VIEW IF EXISTS public.ai_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS public.v_monthly_retail_summary CASCADE;

-- Recreate ai_dashboard_metrics without SECURITY DEFINER
CREATE VIEW public.ai_dashboard_metrics AS
SELECT 
  COUNT(DISTINCT l.id) FILTER (WHERE l.ai_opt_in = true AND l.ai_sequence_paused = false) as active_ai_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.last_reply_at > now() - interval '24 hours') as recent_responses,
  AVG(als.score) as avg_lead_score,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_ai_send_at::date = CURRENT_DATE) as today_scheduled,
  COUNT(DISTINCT l.id) FILTER (WHERE l.next_ai_send_at < now() AND l.ai_opt_in = true AND l.ai_sequence_paused = false) as overdue_sends,
  COUNT(DISTINCT l.id) FILTER (WHERE l.ai_sequence_paused = true) as paused_leads
FROM public.leads l
LEFT JOIN public.ai_lead_scores als ON als.lead_id = l.id;

-- Recreate v_monthly_retail_summary without SECURITY DEFINER
CREATE VIEW public.v_monthly_retail_summary AS
WITH current_month_deals AS (
  SELECT 
    deal_type,
    stock_number,
    CASE 
      WHEN deal_type = 'retail' THEN 'retail'
      WHEN deal_type = 'dealer_trade' THEN 'dealer_trade' 
      WHEN deal_type = 'wholesale' THEN 'wholesale'
      ELSE 'retail'  -- default fallback
    END as normalized_deal_type,
    gross_profit,
    fi_profit,
    total_profit,
    sale_amount
  FROM public.deals 
  WHERE EXTRACT(YEAR FROM upload_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    AND EXTRACT(MONTH FROM upload_date) = EXTRACT(MONTH FROM CURRENT_DATE)
),
deal_type_classification AS (
  SELECT 
    *,
    CASE 
      WHEN stock_number IS NOT NULL AND 
           LEFT(UPPER(TRIM(stock_number)), 1) = 'C' THEN 'new'
      ELSE 'used'
    END as vehicle_type
  FROM current_month_deals
)
SELECT 
  -- New vehicle metrics
  COUNT(*) FILTER (WHERE vehicle_type = 'new') as new_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE vehicle_type = 'new'), 0) as new_gross_mtd,
  
  -- Used vehicle metrics  
  COUNT(*) FILTER (WHERE vehicle_type = 'used') as used_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE vehicle_type = 'used'), 0) as used_gross_mtd,
  
  -- Total metrics
  COUNT(*) as total_units_mtd,
  COALESCE(SUM(total_profit), 0) as total_profit_mtd,
  
  -- Deal type breakdown
  COUNT(*) FILTER (WHERE normalized_deal_type = 'retail') as retail_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'retail'), 0) as retail_gross_mtd,
  
  COUNT(*) FILTER (WHERE normalized_deal_type = 'dealer_trade') as dealer_trade_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'dealer_trade'), 0) as dealer_trade_gross_mtd,
  
  COUNT(*) FILTER (WHERE normalized_deal_type = 'wholesale') as wholesale_units_mtd,
  COALESCE(SUM(gross_profit) FILTER (WHERE normalized_deal_type = 'wholesale'), 0) as wholesale_gross_mtd
FROM deal_type_classification;

-- Verify views are created without SECURITY DEFINER
SELECT 
  schemaname, 
  viewname, 
  definition 
FROM pg_views 
WHERE viewname IN ('ai_dashboard_metrics', 'v_monthly_retail_summary') 
AND schemaname = 'public';