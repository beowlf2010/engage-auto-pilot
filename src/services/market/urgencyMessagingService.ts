
import { supabase } from '@/integrations/supabase/client';
import { generateMarketInsights } from './marketInsightsService';

// Generate urgency messaging based on market conditions
export const generateUrgencyMessage = async (leadId: string): Promise<string | null> => {
  try {
    // Get lead's vehicle interest
    const { data: lead } = await supabase
      .from('leads')
      .select('vehicle_interest')
      .eq('id', leadId)
      .single();

    if (!lead?.vehicle_interest) return null;

    const insights = await generateMarketInsights(lead.vehicle_interest);
    const highUrgencyInsight = insights.find(i => i.urgency === 'high');

    if (highUrgencyInsight) {
      return `${highUrgencyInsight.message} - ${highUrgencyInsight.context}`;
    }

    // Check for inventory-specific urgency using function call
    const { data: matchingVehicles } = await supabase.rpc('find_matching_inventory', { 
      p_lead_id: leadId 
    });
    
    if (matchingVehicles && matchingVehicles.length > 0) {
      const topMatch = matchingVehicles[0];
      
      // Get vehicle details for urgency calculation
      const { data: vehicle } = await supabase
        .from('inventory')
        .select('created_at, days_in_inventory')
        .eq('id', topMatch.inventory_id)
        .single();

      if (vehicle && vehicle.days_in_inventory > 45) {
        return `The ${topMatch.year} ${topMatch.make} ${topMatch.model} has been here ${vehicle.days_in_inventory} days - great opportunity!`;
      }
    }

    return null;
  } catch (error) {
    console.error('Error generating urgency message:', error);
    return null;
  }
};
