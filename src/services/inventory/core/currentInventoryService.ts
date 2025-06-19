
import { supabase } from "@/integrations/supabase/client";

export interface CurrentInventoryFilters {
  onlyAvailable?: boolean;
  excludeGMGlobal?: boolean;
  todayUploadsOnly?: boolean;
}

export const getCurrentInventoryForAI = async (filters: CurrentInventoryFilters = {}) => {
  const {
    onlyAvailable = true,
    excludeGMGlobal = true,
    todayUploadsOnly = false
  } = filters;

  try {
    let query = supabase
      .from('inventory')
      .select(`
        id, vin, stock_number, make, model, year, trim, 
        body_style, color_exterior, color_interior, 
        price, mileage, condition, status, features,
        description, created_at, days_in_inventory,
        source_report, leads_count
      `);

    // Only show available vehicles for AI recommendations
    if (onlyAvailable) {
      query = query.eq('status', 'available');
    }

    // Exclude GM Global orders from regular inventory recommendations
    if (excludeGMGlobal) {
      query = query.neq('source_report', 'orders_all');
    }

    // If requested, only show today's uploads
    if (todayUploadsOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('created_at', `${today}T00:00:00.000Z`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(200); // Reasonable limit for AI processing

    if (error) throw error;

    console.log(`Fetched ${data?.length || 0} current inventory items for AI`, {
      onlyAvailable,
      excludeGMGlobal,
      todayUploadsOnly
    });

    return data || [];
  } catch (error) {
    console.error('Error fetching current inventory for AI:', error);
    return [];
  }
};

export const getInventoryStats = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('status, source_report, created_at')
      .not('status', 'is', null);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    
    const stats = {
      totalAvailable: data.filter(v => v.status === 'available' && v.source_report !== 'orders_all').length,
      totalSold: data.filter(v => v.status === 'sold').length,
      gmGlobalOrders: data.filter(v => v.source_report === 'orders_all').length,
      todaysUploads: data.filter(v => v.created_at.split('T')[0] === today).length,
      currentInventoryCount: data.filter(v => 
        v.status === 'available' && 
        v.source_report !== 'orders_all' && 
        v.created_at.split('T')[0] === today
      ).length
    };

    console.log('Current inventory stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    return {
      totalAvailable: 0,
      totalSold: 0,
      gmGlobalOrders: 0,
      todaysUploads: 0,
      currentInventoryCount: 0
    };
  }
};
