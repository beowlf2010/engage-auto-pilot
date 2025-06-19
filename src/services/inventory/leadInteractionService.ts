
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const addInventoryInterest = async (leadId: string, inventoryId: string, interestType: string, notes?: string) => {
  try {
    console.log(`📝 [LEAD INTERACTION] Adding inventory interest: lead ${leadId}, inventory ${inventoryId}, type ${interestType}`);
    
    // Check if record already exists
    const { data: existing, error: checkError } = await supabase
      .from('lead_inventory_interests')
      .select('id')
      .eq('lead_id', leadId)
      .eq('inventory_id', inventoryId)
      .eq('interest_type', interestType)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ [LEAD INTERACTION] Error checking existing interest:', checkError);
      throw checkError;
    }

    if (existing) {
      console.log(`✅ [LEAD INTERACTION] Interest already exists for lead ${leadId}`);
      // Update existing record with new notes if provided
      if (notes) {
        const { error: updateError } = await supabase
          .from('lead_inventory_interests')
          .update({ notes, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('❌ [LEAD INTERACTION] Error updating existing interest:', updateError);
          throw updateError;
        }
        console.log(`🔄 [LEAD INTERACTION] Updated existing interest with new notes`);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('lead_inventory_interests')
        .insert({
          lead_id: leadId,
          inventory_id: inventoryId,
          interest_type: interestType,
          notes
        });

      if (insertError) {
        console.error('❌ [LEAD INTERACTION] Error inserting new interest:', insertError);
        throw insertError;
      }
      console.log(`✅ [LEAD INTERACTION] Created new interest record`);
    }
    
    // Update leads count for this inventory item
    await updateInventoryLeadsCount();
    
    toast({
      title: "Interest Recorded",
      description: "Lead interest in vehicle has been noted",
    });
  } catch (error) {
    console.error('❌ [LEAD INTERACTION] Error adding inventory interest:', error);
    toast({
      title: "Error",
      description: "Failed to record interest",
      variant: "destructive"
    });
  }
};

export const updateInventoryLeadsCount = async () => {
  try {
    console.log(`🔢 [LEAD INTERACTION] Updating inventory leads count`);
    const { error } = await supabase.rpc('update_inventory_leads_count');
    if (error) {
      console.error('❌ [LEAD INTERACTION] Error updating leads count:', error);
      throw error;
    }
    console.log(`✅ [LEAD INTERACTION] Updated inventory leads count successfully`);
  } catch (error) {
    console.error('❌ [LEAD INTERACTION] Error updating leads count:', error);
    throw error;
  }
};
