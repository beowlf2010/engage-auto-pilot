
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
  mileage?: number;
  price?: number;
  msrp?: number;
  condition: 'new' | 'used' | 'certified';
  status: 'available' | 'sold' | 'pending' | 'service' | 'wholesale';
  fuel_type?: string;
  transmission?: string;
  drivetrain?: string;
  engine?: string;
  features?: string[];
  description?: string;
  dealer_notes?: string;
  images?: string[];
  carfax_url?: string;
  days_in_inventory: number;
  location?: string;
  created_at: string;
  updated_at: string;
  sold_at?: string;
}

export interface PricingDisclaimer {
  id: string;
  name: string;
  disclaimer_text: string;
  disclaimer_type: 'general' | 'internet_price' | 'trade_value' | 'financing' | 'lease';
  is_active: boolean;
}

export const getInventory = async (filters?: {
  make?: string;
  model?: string;
  status?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
}) => {
  try {
    let query = supabase
      .from('inventory')
      .select('*')
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
    return data || [];
  } catch (error) {
    console.error('Error finding matching inventory:', error);
    return [];
  }
};

export const getPricingDisclaimers = async () => {
  try {
    const { data, error } = await supabase
      .from('pricing_disclaimers')
      .select('*')
      .eq('is_active', true)
      .order('disclaimer_type');

    if (error) throw error;
    return data as PricingDisclaimer[];
  } catch (error) {
    console.error('Error fetching disclaimers:', error);
    return [];
  }
};

export const addInventoryInterest = async (leadId: string, inventoryId: string, interestType: string, notes?: string) => {
  try {
    const { error } = await supabase
      .from('lead_inventory_interests')
      .upsert({
        lead_id: leadId,
        inventory_id: inventoryId,
        interest_type: interestType,
        notes
      }, {
        onConflict: 'lead_id,inventory_id,interest_type'
      });

    if (error) throw error;
    
    toast({
      title: "Interest Recorded",
      description: "Lead interest in vehicle has been noted",
    });
  } catch (error) {
    console.error('Error adding inventory interest:', error);
    toast({
      title: "Error",
      description: "Failed to record interest",
      variant: "destructive"
    });
  }
};
