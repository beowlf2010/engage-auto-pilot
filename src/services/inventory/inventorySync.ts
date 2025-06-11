
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  try {
    const { error } = await supabase.rpc('mark_missing_vehicles_sold', {
      p_upload_id: uploadId
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error marking vehicles as sold:', error);
    throw error;
  }
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('Starting inventory data sync...');
    
    // Mark missing vehicles as sold
    await markMissingVehiclesSold(uploadId);
    
    // Update leads count for all vehicles
    await updateInventoryLeadsCount();
    
    console.log('Inventory data sync completed');
    
    toast({
      title: "Sync Complete",
      description: "Inventory data has been synchronized with leads",
    });
  } catch (error) {
    console.error('Error syncing inventory data:', error);
    toast({
      title: "Sync Warning",
      description: "Inventory uploaded but some sync operations failed",
      variant: "destructive"
    });
  }
};
