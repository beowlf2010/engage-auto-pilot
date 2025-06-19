
-- Create vehicle history tracking table
CREATE TABLE public.vehicle_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT,
  stock_number TEXT,
  gm_order_number TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'unknown',
  history_type TEXT NOT NULL, -- 'order', 'inventory', 'sale', 'update'
  source_report TEXT NOT NULL, -- 'gm_global', 'new_car_main_view', 'sales_report', etc.
  source_data JSONB NOT NULL DEFAULT '{}',
  upload_history_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_vehicle_history_vin ON public.vehicle_history(vin) WHERE vin IS NOT NULL;
CREATE INDEX idx_vehicle_history_stock ON public.vehicle_history(stock_number) WHERE stock_number IS NOT NULL;
CREATE INDEX idx_vehicle_history_gm_order ON public.vehicle_history(gm_order_number) WHERE gm_order_number IS NOT NULL;
CREATE INDEX idx_vehicle_history_make_model ON public.vehicle_history(make, model);
CREATE INDEX idx_vehicle_history_source ON public.vehicle_history(source_report);

-- Create vehicle master record table for unified view
CREATE TABLE public.vehicle_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT UNIQUE,
  stock_number TEXT,
  gm_order_number TEXT,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  current_status TEXT NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  order_data JSONB DEFAULT '{}',
  inventory_data JSONB DEFAULT '{}',
  sale_data JSONB DEFAULT '{}',
  data_quality_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for vehicle master
CREATE INDEX idx_vehicle_master_vin ON public.vehicle_master(vin) WHERE vin IS NOT NULL;
CREATE INDEX idx_vehicle_master_stock ON public.vehicle_master(stock_number) WHERE stock_number IS NOT NULL;
CREATE INDEX idx_vehicle_master_gm_order ON public.vehicle_master(gm_order_number) WHERE gm_order_number IS NOT NULL;
CREATE INDEX idx_vehicle_master_status ON public.vehicle_master(current_status);

-- Create duplicate detection results table
CREATE TABLE public.vehicle_duplicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_vehicle_id UUID REFERENCES public.vehicle_master(id),
  duplicate_inventory_id UUID,
  match_type TEXT NOT NULL, -- 'vin_exact', 'stock_exact', 'gm_order_exact', 'fuzzy_match'
  confidence_score NUMERIC NOT NULL DEFAULT 0.0,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_action TEXT, -- 'merged', 'kept_separate', 'manual_review'
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.vehicle_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_duplicates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all vehicle data (for now - can be restricted later)
CREATE POLICY "Allow authenticated read access to vehicle_history" ON public.vehicle_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to vehicle_master" ON public.vehicle_master
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access to vehicle_duplicates" ON public.vehicle_duplicates
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access for backend processing
CREATE POLICY "Allow service role full access to vehicle_history" ON public.vehicle_history
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to vehicle_master" ON public.vehicle_master
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to vehicle_duplicates" ON public.vehicle_duplicates
  FOR ALL TO service_role USING (true);

-- Create function to merge vehicle data into master record
CREATE OR REPLACE FUNCTION public.upsert_vehicle_master(
  p_vin TEXT,
  p_stock_number TEXT,
  p_gm_order_number TEXT,
  p_make TEXT,
  p_model TEXT,
  p_year INTEGER,
  p_status TEXT,
  p_source_report TEXT,
  p_data JSONB
) RETURNS UUID
LANGUAGE plpgsql
AS $function$
DECLARE
  master_id UUID;
  data_field TEXT;
BEGIN
  -- Determine which data field to update based on source report
  data_field := CASE 
    WHEN p_source_report LIKE '%order%' OR p_source_report = 'gm_global' THEN 'order_data'
    WHEN p_source_report LIKE '%inventory%' OR p_source_report = 'new_car_main_view' THEN 'inventory_data'
    WHEN p_source_report LIKE '%sale%' OR p_source_report LIKE '%financial%' THEN 'sale_data'
    ELSE 'inventory_data'
  END;

  -- Try to find existing master record by VIN first, then other identifiers
  SELECT id INTO master_id FROM public.vehicle_master 
  WHERE (p_vin IS NOT NULL AND vin = p_vin)
     OR (p_stock_number IS NOT NULL AND stock_number = p_stock_number)
     OR (p_gm_order_number IS NOT NULL AND gm_order_number = p_gm_order_number)
  LIMIT 1;

  IF master_id IS NULL THEN
    -- Create new master record
    INSERT INTO public.vehicle_master (
      vin, stock_number, gm_order_number, make, model, year, current_status
    )
    VALUES (p_vin, p_stock_number, p_gm_order_number, p_make, p_model, p_year, p_status)
    RETURNING id INTO master_id;
  END IF;

  -- Update the master record with new data
  EXECUTE format('
    UPDATE public.vehicle_master 
    SET %I = %I || $1,
        current_status = COALESCE($2, current_status),
        vin = COALESCE($3, vin),
        stock_number = COALESCE($4, stock_number),
        gm_order_number = COALESCE($5, gm_order_number),
        last_updated_at = now(),
        updated_at = now()
    WHERE id = $6',
    data_field, data_field
  ) USING p_data, p_status, p_vin, p_stock_number, p_gm_order_number, master_id;

  RETURN master_id;
END;
$function$;

-- Create function to detect and record duplicates
CREATE OR REPLACE FUNCTION public.detect_vehicle_duplicates(p_upload_history_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
  duplicate_count INTEGER := 0;
BEGIN
  -- Clear previous duplicates for this upload
  DELETE FROM public.vehicle_duplicates 
  WHERE duplicate_inventory_id IN (
    SELECT id FROM public.inventory WHERE upload_history_id = p_upload_history_id
  );

  -- Detect VIN-based duplicates
  INSERT INTO public.vehicle_duplicates (master_vehicle_id, duplicate_inventory_id, match_type, confidence_score)
  SELECT DISTINCT
    vm.id,
    i.id,
    'vin_exact',
    1.0
  FROM public.inventory i
  JOIN public.vehicle_master vm ON i.vin = vm.vin
  WHERE i.upload_history_id = p_upload_history_id
    AND i.vin IS NOT NULL
    AND LENGTH(i.vin) = 17;

  GET DIAGNOSTICS duplicate_count = ROW_COUNT;

  -- Detect stock number duplicates
  INSERT INTO public.vehicle_duplicates (master_vehicle_id, duplicate_inventory_id, match_type, confidence_score)
  SELECT DISTINCT
    vm.id,
    i.id,
    'stock_exact',
    0.9
  FROM public.inventory i
  JOIN public.vehicle_master vm ON i.stock_number = vm.stock_number
  WHERE i.upload_history_id = p_upload_history_id
    AND i.stock_number IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_duplicates vd 
      WHERE vd.duplicate_inventory_id = i.id
    );

  -- Detect GM order number duplicates
  INSERT INTO public.vehicle_duplicates (master_vehicle_id, duplicate_inventory_id, match_type, confidence_score)
  SELECT DISTINCT
    vm.id,
    i.id,
    'gm_order_exact',
    0.95
  FROM public.inventory i
  JOIN public.vehicle_master vm ON i.gm_order_number = vm.gm_order_number
  WHERE i.upload_history_id = p_upload_history_id
    AND i.gm_order_number IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.vehicle_duplicates vd 
      WHERE vd.duplicate_inventory_id = i.id
    );

  RETURN duplicate_count;
END;
$function$;
