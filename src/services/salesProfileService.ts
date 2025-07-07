import { supabase } from '@/integrations/supabase/client';

export interface SalesProfile {
  id: string;
  user_id: string;
  profile_slug: string;
  display_name: string;
  title: string;
  bio?: string;
  phone_number?: string;
  email?: string;
  profile_image_url?: string;
  background_image_url?: string;
  specialties?: string[];
  years_experience?: number;
  languages_spoken?: string[];
  personal_brand_colors: any;
  social_links: any;
  custom_message?: string;
  show_inventory: boolean;
  show_testimonials: boolean;
  is_active: boolean;
  lead_capture_settings: any;
  qr_code_data?: string;
  page_views: number;
  leads_generated: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileTestimonial {
  id: string;
  profile_id: string;
  customer_name: string;
  customer_location?: string;
  testimonial_text: string;
  rating: number;
  vehicle_purchased?: string;
  purchase_date?: string;
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface FeaturedVehicle {
  id: string;
  profile_id: string;
  inventory_id: string;
  feature_order: number;
  custom_description?: string;
  is_active: boolean;
  created_at: string;
    inventory?: any;
}

export const getSalesProfiles = async (): Promise<SalesProfile[]> => {
  const { data, error } = await supabase
    .from('sales_professional_profiles')
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  if (error) {
    console.error('Error fetching sales profiles:', error);
    return [];
  }

  return (data || []) as SalesProfile[];
};

export const getSalesProfileBySlug = async (slug: string): Promise<SalesProfile | null> => {
  const { data, error } = await supabase
    .from('sales_professional_profiles')
    .select('*')
    .eq('profile_slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching sales profile:', error);
    return null;
  }

  // Increment page views
  if (data) {
    await supabase
      .from('sales_professional_profiles')
      .update({ page_views: data.page_views + 1 })
      .eq('id', data.id);
  }

  return data as SalesProfile;
};

export const getUserSalesProfile = async (): Promise<SalesProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('sales_professional_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No profile found
    console.error('Error fetching user sales profile:', error);
    return null;
  }

  return data;
};

export const createSalesProfile = async (profileData: Partial<SalesProfile>): Promise<SalesProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate a slug from display name
  const slug = profileData.display_name?.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || `profile-${Date.now()}`;

  const { data, error } = await supabase
    .from('sales_professional_profiles')
    .insert({
      ...profileData,
      user_id: user.id,
      profile_slug: slug,
      display_name: profileData.display_name || 'Unknown'
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error creating sales profile:', error);
    throw error;
  }

  return data;
};

export const updateSalesProfile = async (
  profileId: string, 
  updates: Partial<SalesProfile>
): Promise<SalesProfile | null> => {
  const { data, error } = await supabase
    .from('sales_professional_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating sales profile:', error);
    throw error;
  }

  return data;
};

export const getProfileTestimonials = async (profileId: string): Promise<ProfileTestimonial[]> => {
  const { data, error } = await supabase
    .from('sales_professional_testimonials')
    .select('*')
    .eq('profile_id', profileId)
    .eq('is_approved', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching testimonials:', error);
    return [];
  }

  return data || [];
};

export const addTestimonial = async (
  profileId: string, 
  testimonialData: Partial<ProfileTestimonial>
): Promise<ProfileTestimonial | null> => {
  const { data, error } = await supabase
    .from('sales_professional_testimonials')
    .insert({
      ...testimonialData,
      profile_id: profileId,
      customer_name: testimonialData.customer_name || 'Anonymous',
      testimonial_text: testimonialData.testimonial_text || ''
    } as any)
    .select()
    .single();

  if (error) {
    console.error('Error adding testimonial:', error);
    throw error;
  }

  return data;
};

export const getProfileFeaturedVehicles = async (profileId: string): Promise<FeaturedVehicle[]> => {
  const { data, error } = await supabase
    .from('profile_featured_vehicles')
    .select(`
      *,
      inventory (
        make, model, year, price, stock_number
      )
    `)
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .order('feature_order');

  if (error) {
    console.error('Error fetching featured vehicles:', error);
    return [];
  }

  return data || [];
};

export const addFeaturedVehicle = async (
  profileId: string,
  inventoryId: string,
  customDescription?: string
): Promise<FeaturedVehicle | null> => {
  const { data, error } = await supabase
    .from('profile_featured_vehicles')
    .insert({
      profile_id: profileId,
      inventory_id: inventoryId,
      custom_description: customDescription,
      feature_order: 0, // Will be updated later if needed
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding featured vehicle:', error);
    throw error;
  }

  return data;
};

export const trackLeadCapture = async (profileId: string): Promise<void> => {
  try {
    const { data: current } = await supabase
      .from('sales_professional_profiles')
      .select('leads_generated')
      .eq('id', profileId)
      .single();
    
    await supabase
      .from('sales_professional_profiles')
      .update({ 
        leads_generated: (current?.leads_generated || 0) + 1
      })
      .eq('id', profileId);
  } catch (error) {
    console.error('Error tracking lead capture:', error);
  }
};

export const generateProfileSlug = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};