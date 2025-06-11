
-- Create deals table to store individual vehicle sale records
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_date DATE NOT NULL,
  stock_number TEXT,
  age INTEGER,
  year_model TEXT,
  buyer_name TEXT,
  sale_amount NUMERIC(12,2),
  cost_amount NUMERIC(12,2),
  gross_profit NUMERIC(12,2),
  fi_profit NUMERIC(12,2),
  total_profit NUMERIC(12,2),
  deal_type TEXT, -- 'new' or 'used'
  upload_history_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profit_snapshots table for daily/monthly aggregated data
CREATE TABLE public.profit_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_units INTEGER NOT NULL DEFAULT 0,
  total_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_fi_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  new_units INTEGER NOT NULL DEFAULT 0,
  new_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  used_units INTEGER NOT NULL DEFAULT 0,
  used_gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  upload_history_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deals table (manager/admin only)
CREATE POLICY "Managers and admins can view deals" 
  ON public.deals 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert deals" 
  ON public.deals 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update deals" 
  ON public.deals 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Create RLS policies for profit_snapshots table (manager/admin only)
CREATE POLICY "Managers and admins can view profit snapshots" 
  ON public.profit_snapshots 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can insert profit snapshots" 
  ON public.profit_snapshots 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can update profit snapshots" 
  ON public.profit_snapshots 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  );

-- Create view for monthly retail summary
CREATE OR REPLACE VIEW public.v_monthly_retail_summary AS
SELECT 
  DATE_TRUNC('month', snapshot_date) as month,
  SUM(new_units) as new_units_mtd,
  SUM(new_gross) as new_gross_mtd,
  SUM(used_units) as used_units_mtd,
  SUM(used_gross) as used_gross_mtd,
  SUM(total_units) as total_units_mtd,
  SUM(total_profit) as total_profit_mtd
FROM public.profit_snapshots
WHERE snapshot_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', snapshot_date);

-- Create function to upsert profit snapshot
CREATE OR REPLACE FUNCTION public.upsert_profit_snapshot(
  p_date DATE,
  p_total_units INTEGER,
  p_total_sales NUMERIC,
  p_total_gross NUMERIC,
  p_total_fi_profit NUMERIC,
  p_total_profit NUMERIC,
  p_new_units INTEGER,
  p_new_gross NUMERIC,
  p_used_units INTEGER,
  p_used_gross NUMERIC,
  p_upload_history_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot_id UUID;
BEGIN
  INSERT INTO public.profit_snapshots (
    snapshot_date, total_units, total_sales, total_gross, 
    total_fi_profit, total_profit, new_units, new_gross, 
    used_units, used_gross, upload_history_id
  )
  VALUES (
    p_date, p_total_units, p_total_sales, p_total_gross,
    p_total_fi_profit, p_total_profit, p_new_units, p_new_gross,
    p_used_units, p_used_gross, p_upload_history_id
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    total_units = EXCLUDED.total_units,
    total_sales = EXCLUDED.total_sales,
    total_gross = EXCLUDED.total_gross,
    total_fi_profit = EXCLUDED.total_fi_profit,
    total_profit = EXCLUDED.total_profit,
    new_units = EXCLUDED.new_units,
    new_gross = EXCLUDED.new_gross,
    used_units = EXCLUDED.used_units,
    used_gross = EXCLUDED.used_gross,
    upload_history_id = EXCLUDED.upload_history_id,
    updated_at = now()
  RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$;
