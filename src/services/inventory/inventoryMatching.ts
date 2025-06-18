
import { supabase } from '@/integrations/supabase/client';

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
