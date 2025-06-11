
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
    
    // Update leads count for this inventory item
    await updateInventoryLeadsCount();
    
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

export const updateInventoryLeadsCount = async () => {
  try {
    const { error } = await supabase.rpc('update_inventory_leads_count');
    if (error) throw error;
  } catch (error) {
    console.error('Error updating leads count:', error);
    throw error;
  }
};
