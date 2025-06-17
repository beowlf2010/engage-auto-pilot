
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  // This function is deprecated - we no longer mark vehicles as sold from inventory uploads
  // Only financial data should mark vehicles as sold
  console.log('Skipping automatic sold marking - only financial data should mark vehicles as sold');
  return;
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('Starting inventory data sync for upload:', uploadId);
    
    // Only update leads count and other metadata - DO NOT mark vehicles as sold
    await updateInventoryLeadsCount();
    
    console.log('Inventory data sync completed successfully');
    
    toast({
      title: "Inventory synced",
      description: "Inventory metadata has been updated successfully",
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
