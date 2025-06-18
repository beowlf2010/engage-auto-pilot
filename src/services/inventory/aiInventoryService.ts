
import { supabase } from '@/integrations/supabase/client';

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
