-- Create sales professional profiles table for personalized lead capture pages
CREATE TABLE IF NOT EXISTS public.sales_professional_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  title TEXT DEFAULT 'Sales Professional',
  bio TEXT,
  phone_number TEXT,
  email TEXT,
  profile_image_url TEXT,
  background_image_url TEXT,
  specialties TEXT[],
  years_experience INTEGER,
  languages_spoken TEXT[],
  personal_brand_colors JSONB DEFAULT '{"primary": "#2563eb", "secondary": "#64748b"}',
  social_links JSONB DEFAULT '{}',
  custom_message TEXT,
  show_inventory BOOLEAN DEFAULT true,
  show_testimonials BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  lead_capture_settings JSONB DEFAULT '{"auto_assign": true, "send_notification": true}',
  qr_code_data TEXT,
  page_views INTEGER DEFAULT 0,
  leads_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales professional testimonials table
CREATE TABLE IF NOT EXISTS public.sales_professional_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.sales_professional_profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_location TEXT,
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  vehicle_purchased TEXT,
  purchase_date DATE,
  is_featured BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create featured vehicles for profiles
CREATE TABLE IF NOT EXISTS public.profile_featured_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.sales_professional_profiles(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
  feature_order INTEGER DEFAULT 0,
  custom_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_profiles_slug ON public.sales_professional_profiles(profile_slug);
CREATE INDEX IF NOT EXISTS idx_sales_profiles_user ON public.sales_professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_profiles_active ON public.sales_professional_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_testimonials_profile ON public.sales_professional_testimonials(profile_id);
CREATE INDEX IF NOT EXISTS idx_featured_vehicles_profile ON public.profile_featured_vehicles(profile_id);

-- Enable RLS
ALTER TABLE public.sales_professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_professional_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_featured_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_professional_profiles
CREATE POLICY "Anyone can view active profiles" ON public.sales_professional_profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own profile" ON public.sales_professional_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage all profiles" ON public.sales_professional_profiles
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- RLS Policies for testimonials
CREATE POLICY "Anyone can view approved testimonials" ON public.sales_professional_testimonials
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Profile owners can manage testimonials" ON public.sales_professional_testimonials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sales_professional_profiles 
      WHERE id = profile_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage all testimonials" ON public.sales_professional_testimonials
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles 
      WHERE role IN ('admin', 'manager')
    )
  );

-- RLS Policies for featured vehicles
CREATE POLICY "Anyone can view featured vehicles" ON public.profile_featured_vehicles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Profile owners can manage featured vehicles" ON public.profile_featured_vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sales_professional_profiles 
      WHERE id = profile_id AND user_id = auth.uid()
    )
  );

-- Function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_sales_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_sales_profile_updated_at
  BEFORE UPDATE ON public.sales_professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sales_profile_updated_at();

-- Function to generate QR code data
CREATE OR REPLACE FUNCTION public.generate_profile_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate QR code data as the profile URL
  NEW.qr_code_data = 'https://your-domain.com/profile/' || NEW.profile_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate QR code data
CREATE TRIGGER generate_profile_qr_code
  BEFORE INSERT OR UPDATE ON public.sales_professional_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_qr_code();