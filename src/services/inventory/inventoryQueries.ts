
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { InventoryItem, InventoryFilters } from './types';

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

// Re-export everything from the separated modules
export type { InventoryItem, InventoryFilters } from './types';
export { findMatchingInventory } from './inventoryMatching';
export { getInventoryForAIMessaging } from './aiInventoryService';
export { getRPOAnalytics } from './inventoryAnalytics';
