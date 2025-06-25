
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateInventoryLeadsCount } from './leadInteractionService';
import { performInventoryCleanup } from './core/inventoryCleanupService';
import { validateUploadSuccess } from './uploadValidationService';
import { uploadSessionService } from './uploadSessionService';

export const markMissingVehiclesSold = async (uploadId: string) => {
  // This function is deprecated - we now use enhanced "today vs yesterday" comparison logic
  console.log('Skipping legacy sold marking - using enhanced "today vs yesterday" logic with validation');
  return;
};

export const syncInventoryData = async (uploadId: string) => {
  try {
    console.log('🚀 Starting enhanced inventory data sync with validation for upload:', uploadId);
    
    // Update session activity
    uploadSessionService.updateSessionActivity(uploadId);
    
    // Enhanced validation: Check if upload actually succeeded before proceeding
    const uploadValidation = await validateUploadSuccess(uploadId);
    console.log('📋 Upload validation result:', uploadValidation);
    
    if (!uploadValidation.isValid) {
      console.warn('⚠️ Upload validation failed - will not trigger cleanup');
      toast({
        title: "Upload Validation Warning",
        description: uploadValidation.reason || "Upload may not have inserted all vehicles correctly",
        variant: "destructive"
      });
      
      // Still update leads count but don't run cleanup
      await updateInventoryLeadsCount();
      return;
    }
    
    // Check upload type to determine appropriate actions
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
    // AND only if upload validation passed
    if (!isGMGlobalUpload && !isPreliminaryData && uploadValidation.isValid) {
      console.log('🧹 Running enhanced "today vs yesterday" inventory cleanup with validation...');
      try {
        await performInventoryCleanup();
        console.log('✅ Enhanced "Today vs Yesterday" cleanup completed - vehicles properly validated');
      } catch (cleanupError) {
        console.error('Enhanced "Today vs Yesterday" cleanup failed:', cleanupError);
        toast({
          title: "Cleanup Warning",
          description: "Inventory uploaded successfully but cleanup had issues",
          variant: "default"
        });
      }
    } else {
      const skipReason = !uploadValidation.isValid ? 'upload validation failed' :
                        isGMGlobalUpload ? 'GM Global/preliminary data upload' :
                        'other conditions';
      console.log(`Skipping cleanup: ${skipReason}`);
    }
    
    console.log('🎉 Enhanced inventory data sync with validation completed successfully');
    
    // Provide appropriate success message based on validation results
    if (uploadValidation.mismatch) {
      toast({
        title: "Upload completed with warnings",
        description: `Uploaded but some data may not have been processed correctly. Check diagnostics.`,
        variant: "default"
      });
    } else {
      toast({
        title: "Inventory synced successfully",
        description: isGMGlobalUpload ? "GM Global orders updated and validated" : "Current inventory updated using enhanced validation",
      });
    }
  } catch (error) {
    console.error('Error in enhanced inventory sync:', error);
    toast({
      title: "Sync Warning",
      description: "Inventory uploaded but some sync operations had issues. Check console for details.",
      variant: "destructive"
    });
  }
};
