
-- Add missing fields to leads table for simplified AI workflow
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_stage text DEFAULT 'new';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_reply_at timestamptz;

-- Create KPIs table for daily roll-ups
CREATE TABLE IF NOT EXISTS public.kpis (
  date date PRIMARY KEY,
  leads_created integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  replies_in integer DEFAULT 0,
  cars_sold integer DEFAULT 0,
  gross_profit numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on KPIs table
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for KPIs (viewable by all authenticated users)
CREATE POLICY "All authenticated users can view KPIs" ON public.kpis
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers and admins can manage KPIs" ON public.kpis
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Function to update daily KPIs
CREATE OR REPLACE FUNCTION public.update_daily_kpis(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.kpis (
    date, 
    leads_created, 
    messages_sent, 
    replies_in,
    cars_sold,
    gross_profit
  )
  VALUES (
    target_date,
    (SELECT COUNT(*) FROM public.leads WHERE DATE(created_at) = target_date),
    (SELECT COUNT(*) FROM public.conversations WHERE DATE(sent_at) = target_date AND direction = 'out'),
    (SELECT COUNT(*) FROM public.conversations WHERE DATE(sent_at) = target_date AND direction = 'in'),
    (SELECT COUNT(*) FROM public.deals WHERE DATE(upload_date) = target_date),
    (SELECT COALESCE(SUM(total_profit), 0) FROM public.deals WHERE DATE(upload_date) = target_date)
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    leads_created = EXCLUDED.leads_created,
    messages_sent = EXCLUDED.messages_sent,
    replies_in = EXCLUDED.replies_in,
    cars_sold = EXCLUDED.cars_sold,
    gross_profit = EXCLUDED.gross_profit,
    updated_at = now();
END;
$$;

-- Function to schedule next AI touch
CREATE OR REPLACE FUNCTION public.schedule_next_touch(lead_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.leads 
  SET 
    next_ai_send_at = now() + interval '1 day',
    ai_stage = 'scheduled'
  WHERE id = lead_uuid;
END;
$$;

-- Trigger function for AI opt-in
CREATE OR REPLACE FUNCTION public.handle_ai_optin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ai_opt_in = true AND (OLD.ai_opt_in IS NULL OR OLD.ai_opt_in = false) THEN
    PERFORM public.schedule_next_touch(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for AI opt-in
DROP TRIGGER IF EXISTS leads_ai_optin_trigger ON public.leads;
CREATE TRIGGER leads_ai_optin_trigger
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_ai_optin();

-- Update last_reply_at when incoming messages are received
CREATE OR REPLACE FUNCTION public.update_last_reply()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.direction = 'in' THEN
    UPDATE public.leads 
    SET last_reply_at = NEW.sent_at
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for updating last reply time
DROP TRIGGER IF EXISTS update_last_reply_trigger ON public.conversations;
CREATE TRIGGER update_last_reply_trigger
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_reply();
