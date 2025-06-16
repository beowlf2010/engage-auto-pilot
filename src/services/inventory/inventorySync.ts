
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  try {
    console.log('Marking missing vehicles as sold for upload:', uploadId);
    
    // Use the new cleanup function instead of the old RPC
    const { data: recentVehicles } = await supabase
      .from('inventory')
      .select('id')
      .eq('upload_history_id', uploadId);

    if (!recentVehicles || recentVehicles.length === 0) {
      console.log('No vehicles found for this upload');
      return;
    }

    const keepIds = recentVehicles.map(v => v.id);
    
    // Mark vehicles not in this upload as sold
    const { error } = await supabase
      .from('inventory')
      .update({
        status: 'sold',
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('status', 'available')
      .not('id', 'in', `(${keepIds.map(id => `'${id}'`).join(',')})`);

    if (error) {
      console.error('Error marking vehicles as sold:', error);
      throw error;
    }

    console.log('Successfully marked missing vehicles as sold');
  } catch (error) {
    console.error('Error in markMissingVehiclesSold:', error);
    throw error;
  }
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('Starting inventory data sync for upload:', uploadId);
    
    // Mark missing vehicles as sold
    await markMissingVehiclesSold(uploadId);
    
    // Update leads count for all vehicles
    await updateInventoryLeadsCount();
    
    console.log('Inventory data sync completed successfully');
    
    toast({
      title: "Sync Complete",
      description: "Inventory data has been synchronized successfully",
    });
  } catch (error) {
    console.error('Error syncing inventory data:', error);
    toast({
      title: "Sync Warning",
      description: "Inventory uploaded but some sync operations had issues. Check console for details.",
      variant: "destructive"
    });
  }
};
