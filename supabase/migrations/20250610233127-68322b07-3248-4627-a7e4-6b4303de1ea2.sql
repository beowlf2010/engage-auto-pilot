
-- Create inventory table for vehicle inventory management
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT UNIQUE NOT NULL,
  stock_number TEXT,
  year INTEGER,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  trim TEXT,
  body_style TEXT,
  color_exterior TEXT,
  color_interior TEXT,
  mileage INTEGER,
  price DECIMAL(10,2),
  msrp DECIMAL(10,2),
  condition TEXT NOT NULL DEFAULT 'used' CHECK (condition IN ('new', 'used', 'certified')),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'pending', 'service', 'wholesale')),
  fuel_type TEXT,
  transmission TEXT,
  drivetrain TEXT,
  engine TEXT,
  features TEXT[], -- Array of features
  description TEXT,
  dealer_notes TEXT,
  images TEXT[], -- Array of image URLs
  carfax_url TEXT,
  days_in_inventory INTEGER DEFAULT 0,
  location TEXT DEFAULT 'lot',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sold_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient searching
CREATE INDEX idx_inventory_make_model ON public.inventory(make, model);
CREATE INDEX idx_inventory_year ON public.inventory(year);
CREATE INDEX idx_inventory_price ON public.inventory(price);
CREATE INDEX idx_inventory_status ON public.inventory(status);
CREATE INDEX idx_inventory_vin ON public.inventory(vin);

-- Create table for pricing disclaimers
CREATE TABLE public.pricing_disclaimers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  disclaimer_text TEXT NOT NULL,
  disclaimer_type TEXT NOT NULL DEFAULT 'general' CHECK (disclaimer_type IN ('general', 'internet_price', 'trade_value', 'financing', 'lease')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default disclaimers
INSERT INTO public.pricing_disclaimers (name, disclaimer_text, disclaimer_type) VALUES 
('General Pricing', 'Price plus tax, title, license and dealer fees. See dealer for details.', 'general'),
('Internet Pricing', 'Internet price requires financing through dealer and may require trade-in. Price plus tax, title, license and dealer fees.', 'internet_price'),
('Trade Value', 'Trade-in value based on vehicle condition and current market conditions. Actual value may vary.', 'trade_value'),
('Financing Terms', 'Financing terms subject to credit approval. APR and terms may vary based on creditworthiness.', 'financing'),
('Lease Terms', 'Lease payments based on approved credit. Additional fees and restrictions may apply.', 'lease');

-- Create table to link leads with inventory interests
CREATE TABLE public.lead_inventory_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  inventory_id UUID NOT NULL,
  interest_type TEXT NOT NULL DEFAULT 'viewed' CHECK (interest_type IN ('viewed', 'test_drive', 'quote_requested', 'interested')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, inventory_id, interest_type)
);

-- Add RLS policies for inventory (viewable by all authenticated users)
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view inventory" ON public.inventory FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage inventory" ON public.inventory FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  )
);

-- RLS for disclaimers
ALTER TABLE public.pricing_disclaimers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view disclaimers" ON public.pricing_disclaimers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers can manage disclaimers" ON public.pricing_disclaimers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('manager', 'admin')
  )
);

-- RLS for lead inventory interests
ALTER TABLE public.lead_inventory_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view lead inventory interests" ON public.lead_inventory_interests FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can manage lead inventory interests" ON public.lead_inventory_interests FOR ALL USING (auth.role() = 'authenticated');

-- Add inventory-related fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_price_min DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_price_max DECIMAL(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_year_min INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_year_max INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_mileage_max INTEGER;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS financing_needed BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS trade_in_vehicle TEXT;

-- Create function to update inventory days_in_inventory automatically
CREATE OR REPLACE FUNCTION update_inventory_days()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.inventory 
  SET days_in_inventory = EXTRACT(DAY FROM (now() - created_at))::INTEGER
  WHERE status = 'available';
END;
$$;

-- Create function to find matching inventory for a lead
CREATE OR REPLACE FUNCTION find_matching_inventory(p_lead_id UUID)
RETURNS TABLE (
  inventory_id UUID,
  match_score INTEGER,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  price DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as inventory_id,
    (
      CASE WHEN l.vehicle_interest ILIKE '%' || i.make || '%' THEN 20 ELSE 0 END +
      CASE WHEN l.vehicle_interest ILIKE '%' || i.model || '%' THEN 20 ELSE 0 END +
      CASE WHEN l.preferred_price_min IS NULL OR i.price >= l.preferred_price_min THEN 10 ELSE 0 END +
      CASE WHEN l.preferred_price_max IS NULL OR i.price <= l.preferred_price_max THEN 10 ELSE 0 END +
      CASE WHEN l.preferred_year_min IS NULL OR i.year >= l.preferred_year_min THEN 5 ELSE 0 END +
      CASE WHEN l.preferred_year_max IS NULL OR i.year <= l.preferred_year_max THEN 5 ELSE 0 END
    ) as match_score,
    i.vin,
    i.year,
    i.make,
    i.model,
    i.price
  FROM public.inventory i
  CROSS JOIN public.leads l
  WHERE l.id = p_lead_id
    AND i.status = 'available'
  ORDER BY match_score DESC, i.price ASC
  LIMIT 10;
END;
$$;
