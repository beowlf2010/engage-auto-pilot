import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  vin: string;
  stock_number?: string;
  year?: number;
  make: string;
  model: string;
  trim?: string;
  body_style?: string;
  color_exterior?: string;
  color_interior?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  fuel_type?: string;
  mileage?: number;
  price?: number;
  msrp?: number;
  invoice?: number;
  rebates?: number;
  pack?: number;
  condition: 'new' | 'used' | 'certified';
  status: 'available' | 'sold' | 'pending' | 'service' | 'wholesale';
  source_report?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpo_codes?: string[];
  rpo_descriptions?: string[];
  full_option_blob?: any;
  first_seen_at?: string;
  last_seen_at?: string;
  sold_at?: string;
  days_in_inventory?: number;
  leads_count?: number;
  features?: string[];
  description?: string;
  dealer_notes?: string;
  images?: string[];
  carfax_url?: string;
  location?: string;
  upload_history_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryFilters {
  make?: string;
  model?: string;
  status?: string;
  sourceReport?: 'new_car_main_view' | 'merch_inv_view' | 'orders_all';
  rpoCode?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
}

export const getInventory = async (filters?: InventoryFilters) => {
  try {
    let query = supabase
      .from('inventory')
      .select('*')
      .order('source_report', { ascending: false }) // Prioritize website_scrape data
      .order('created_at', { ascending: false });

    if (filters?.make) {
      query = query.ilike('make', `%${filters.make}%`);
    }
    if (filters?.model) {
      query = query.ilike('model', `%${filters.model}%`);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.sourceReport) {
      query = query.eq('source_report', filters.sourceReport);
    }
    if (filters?.rpoCode) {
      query = query.contains('rpo_codes', [filters.rpoCode]);
    }
    if (filters?.priceMin) {
      query = query.gte('price', filters.priceMin);
    }
    if (filters?.priceMax) {
      query = query.lte('price', filters.priceMax);
    }
    if (filters?.yearMin) {
      query = query.gte('year', filters.yearMin);
    }
    if (filters?.yearMax) {
      query = query.lte('year', filters.yearMax);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as InventoryItem[];
  } catch (error) {
    console.error('Error fetching inventory:', error);
    toast({
      title: "Error",
      description: "Failed to fetch inventory",
      variant: "destructive"
    });
    return [];
  }
};

export const findMatchingInventory = async (leadId: string) => {
  try {
    const { data, error } = await supabase.rpc('find_matching_inventory', {
      p_lead_id: leadId
    });

    if (error) throw error;
    
    // Log the inventory results for AI message debugging
    console.log('Matching inventory for AI messages:', data);
    if (data && data.length > 0) {
      console.log('Sample inventory item for AI:', {
        make: data[0].make,
        model: data[0].model,
        year: data[0].year,
        hasUnknownModel: data[0].model === 'Unknown'
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error finding matching inventory:', error);
    return [];
  }
};

// Enhanced function to get inventory with proper model names for AI messaging
export const getInventoryForAIMessaging = async (leadId: string) => {
  try {
    // First get the lead's vehicle interest
    const { data: lead } = await supabase
      .from('leads')
      .select('vehicle_interest, vehicle_make, vehicle_model, vehicle_year')
      .eq('id', leadId)
      .single();
    
    if (!lead) return [];
    
    // Build a query to find relevant inventory, prioritizing website scraped data
    let query = supabase
      .from('inventory')
      .select('id, vin, year, make, model, trim, price, stock_number, condition, source_report, description, images')
      .eq('status', 'available')
      .order('source_report', { ascending: false }) // Prioritize website_scrape data first
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Only exclude "Unknown" model if it's not from website scraping
    query = query.or('source_report.eq.website_scrape,model.neq.Unknown');
    
    // Add filters based on lead's interest
    if (lead.vehicle_make) {
      query = query.ilike('make', `%${lead.vehicle_make}%`);
    }
    
    if (lead.vehicle_model && lead.vehicle_model !== 'Unknown') {
      query = query.or(`model.ilike.%${lead.vehicle_model}%,trim.ilike.%${lead.vehicle_model}%`);
    }
    
    if (lead.vehicle_year) {
      const year = parseInt(lead.vehicle_year);
      if (!isNaN(year)) {
        query = query.eq('year', year);
      }
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    console.log('Enhanced AI messaging inventory results:', {
      leadInterest: lead.vehicle_interest,
      foundCount: data?.length || 0,
      websiteScrapedCount: data?.filter(v => v.source_report === 'website_scrape').length || 0,
      sampleVehicles: data?.slice(0, 3).map(v => ({
        description: `${v.year} ${v.make} ${v.model || v.trim}`,
        source: v.source_report,
        price: v.price
      })) || []
    });
    
    return data || [];
  } catch (error) {
    console.error('Error getting enhanced inventory for AI messaging:', error);
    return [];
  }
};

export const getRPOAnalytics = async () => {
  try {
    const { data, error } = await supabase.rpc('get_rpo_analytics');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching RPO analytics:', error);
    return [];
  }
};
