
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';
import { performInventoryCleanup } from './core/inventoryCleanupService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  // This function is deprecated - we no longer mark vehicles as sold from inventory uploads
  // Only financial data should mark vehicles as sold
  console.log('Skipping automatic sold marking - only financial data should mark vehicles as sold');
  return;
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('Starting enhanced inventory data sync for upload:', uploadId);
    
    // Check if this is a GM Global upload (should not trigger cleanup)
    const { data: uploadInfo, error: uploadError } = await supabase
      .from('upload_history')
      .select('original_filename, upload_type')
      .eq('id', uploadId)
      .single();

    if (uploadError) {
      console.warn('Could not fetch upload info:', uploadError);
    }

    const isGMGlobalUpload = uploadInfo?.original_filename?.toLowerCase().includes('gm') || 
                            uploadInfo?.original_filename?.toLowerCase().includes('global') ||
                            uploadInfo?.original_filename?.toLowerCase().includes('order');

    const isPreliminaryData = uploadInfo?.original_filename?.toLowerCase().includes('preliminary') || 
                              uploadInfo?.original_filename?.toLowerCase().includes('prelim');

    // Update leads count and other metadata
    await updateInventoryLeadsCount();
    
    // Only run cleanup for actual inventory uploads (not GM Global orders or preliminary data)
    if (!isGMGlobalUpload && !isPreliminaryData) {
      console.log('Running automatic inventory cleanup to keep only current vehicles...');
      try {
        await performInventoryCleanup();
        console.log('Automatic cleanup completed - only current inventory is now marked as available');
      } catch (cleanupError) {
        console.error('Automatic cleanup failed:', cleanupError);
        toast({
          title: "Cleanup Warning",
          description: "Inventory uploaded successfully but automatic cleanup had issues",
          variant: "default"
        });
      }
    } else {
      console.log('Skipping cleanup for GM Global/preliminary data upload');
    }
    
    console.log('Enhanced inventory data sync completed successfully');
    
    toast({
      title: "Inventory synced",
      description: isGMGlobalUpload ? "GM Global orders updated" : "Current inventory updated and old vehicles marked as sold",
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
