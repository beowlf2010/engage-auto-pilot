
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';
import { performInventoryCleanup } from './core/inventoryCleanupService';
import { uploadSessionService } from './uploadSessionService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  // This function is deprecated - we now use "today vs yesterday" comparison logic
  console.log('Skipping legacy sold marking - using new "today vs yesterday" logic');
  return;
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('Starting enhanced inventory data sync with "today vs yesterday" logic for upload:', uploadId);
    
    // Update session activity
    uploadSessionService.updateSessionActivity(uploadId);
    
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
    
    // Check if we should skip automatic cleanup due to active upload session
    const shouldSkipCleanup = uploadSessionService.shouldSkipAutoCleanup();
    
    if (shouldSkipCleanup) {
      console.log('📁 [UPLOAD SESSION] Skipping automatic cleanup - upload session is active');
      toast({
        title: "Inventory uploaded",
        description: "File processed successfully. Automatic cleanup is disabled during multi-file uploads.",
      });
      return;
    }
    
    // Only run cleanup for actual inventory uploads (not GM Global orders or preliminary data)
    if (!isGMGlobalUpload && !isPreliminaryData) {
      console.log('Running "today vs yesterday" inventory cleanup...');
      try {
        await performInventoryCleanup();
        console.log('"Today vs Yesterday" cleanup completed - vehicles from yesterday not in today marked as sold');
      } catch (cleanupError) {
        console.error('"Today vs Yesterday" cleanup failed:', cleanupError);
        toast({
          title: "Cleanup Warning",
          description: "Inventory uploaded successfully but cleanup had issues",
          variant: "default"
        });
      }
    } else {
      console.log('Skipping cleanup for GM Global/preliminary data upload');
    }
    
    console.log('Enhanced inventory data sync with "today vs yesterday" logic completed successfully');
    
    toast({
      title: "Inventory synced",
      description: isGMGlobalUpload ? "GM Global orders updated" : "Current inventory updated using today vs yesterday comparison",
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
