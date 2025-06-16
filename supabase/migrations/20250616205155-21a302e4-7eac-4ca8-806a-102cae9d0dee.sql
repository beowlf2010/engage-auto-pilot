
-- Create table to track profit changes over time
CREATE TABLE public.deal_profit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL,
  stock_number TEXT,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_profit NUMERIC,
  fi_profit NUMERIC,
  total_profit NUMERIC,
  pack_adjustment_applied NUMERIC DEFAULT 0,
  change_type TEXT NOT NULL DEFAULT 'update', -- 'initial', 'update', 'reupload'
  upload_history_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_deal_profit_history_deal_id ON public.deal_profit_history(deal_id);
CREATE INDEX idx_deal_profit_history_stock_number ON public.deal_profit_history(stock_number);
CREATE INDEX idx_deal_profit_history_snapshot_date ON public.deal_profit_history(snapshot_date);

-- Enable RLS (if needed for future user access controls)
ALTER TABLE public.deal_profit_history ENABLE ROW LEVEL SECURITY;

-- Create a function to track profit changes when deals are updated
CREATE OR REPLACE FUNCTION public.track_deal_profit_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if this is an update and profit values have changed
  IF TG_OP = 'UPDATE' AND (
    OLD.gross_profit IS DISTINCT FROM NEW.gross_profit OR
    OLD.fi_profit IS DISTINCT FROM NEW.fi_profit OR
    OLD.total_profit IS DISTINCT FROM NEW.total_profit
  ) THEN
    INSERT INTO public.deal_profit_history (
      deal_id,
      stock_number,
      snapshot_date,
      gross_profit,
      fi_profit,
      total_profit,
      change_type,
      upload_history_id
    ) VALUES (
      NEW.id,
      NEW.stock_number,
      CURRENT_DATE,
      NEW.gross_profit,
      NEW.fi_profit,
      NEW.total_profit,
      'update',
      NEW.upload_history_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically track profit changes
CREATE TRIGGER deal_profit_change_tracker
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.track_deal_profit_changes();
