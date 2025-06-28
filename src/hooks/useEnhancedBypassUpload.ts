
import { useState } from 'react';
import { uploadLeadsWithRLSBypass, promoteToAdmin, BypassUploadResult } from '@/utils/leadOperations/rlsBypassUploader';
import { checkForDatabaseDuplicates, DuplicateCheckResult } from '@/utils/leadOperations/enhancedDuplicateChecker';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { toast } from '@/hooks/use-toast';

export interface EnhancedUploadResult extends BypassUploadResult {
  duplicateCheckResult?: DuplicateCheckResult;
  skippedDuplicates?: number;
}

export const useEnhancedBypassUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<EnhancedUploadResult | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const uploadLeads = async (leads: ProcessedLead[], uploadHistoryId?: string): Promise<EnhancedUploadResult> => {
    setUploading(true);
    setUploadResult(null);

    try {
      console.log('🔄 [ENHANCED BYPASS] Starting enhanced upload process for', leads.length, 'leads');
      
      // Step 1: Check for database duplicates
      setCheckingDuplicates(true);
      console.log('🔍 [ENHANCED BYPASS] Checking for existing duplicates in database...');
      
      const duplicateCheckResult = await checkForDatabaseDuplicates(leads);
      setCheckingDuplicates(false);
      
      console.log('🎯 [ENHANCED BYPASS] Duplicate check results:', {
        totalProcessed: duplicateCheckResult.checkSummary.totalProcessed,
        uniqueLeads: duplicateCheckResult.checkSummary.uniqueCount,
        duplicatesFound: duplicateCheckResult.checkSummary.duplicateCount
      });
      
      // Show duplicate summary
      if (duplicateCheckResult.duplicateLeads.length > 0) {
        toast({
          title: "Duplicates Found",
          description: `Found ${duplicateCheckResult.duplicateLeads.length} duplicate leads that will be skipped`,
          variant: "default"
        });
      }
      
      // Step 2: Upload only unique leads if any exist
      let uploadResult: BypassUploadResult;
      
      if (duplicateCheckResult.uniqueLeads.length > 0) {
        console.log('📤 [ENHANCED BYPASS] Uploading', duplicateCheckResult.uniqueLeads.length, 'unique leads');
        uploadResult = await uploadLeadsWithRLSBypass(duplicateCheckResult.uniqueLeads, uploadHistoryId);
      } else {
        console.log('⏭️ [ENHANCED BYPASS] No unique leads to upload, all were duplicates');
        uploadResult = {
          success: true,
          totalProcessed: leads.length,
          successfulInserts: 0,
          errors: [],
          message: 'All leads were identified as duplicates and skipped'
        };
      }

      // Step 3: Combine results
      const enhancedResult: EnhancedUploadResult = {
        ...uploadResult,
        duplicateCheckResult,
        skippedDuplicates: duplicateCheckResult.duplicateLeads.length,
        totalProcessed: leads.length // Override to show original total
      };

      setUploadResult(enhancedResult);

      // Step 4: Show appropriate success/info messages
      if (enhancedResult.successfulInserts > 0) {
        toast({
          title: "Upload Successful",
          description: `${enhancedResult.successfulInserts} new leads uploaded successfully${enhancedResult.skippedDuplicates ? `, ${enhancedResult.skippedDuplicates} duplicates skipped` : ''}`,
        });
      } else if (enhancedResult.skippedDuplicates === leads.length) {
        toast({
          title: "No New Leads",
          description: "All leads in the file already exist in the database",
          variant: "default"
        });
      } else if (enhancedResult.errors.length > 0) {
        toast({
          title: "Upload Issues",
          description: `${enhancedResult.errors.length} leads failed to upload`,
          variant: "destructive"
        });
      }

      return enhancedResult;
    } catch (error) {
      console.error('💥 [ENHANCED BYPASS] Upload error:', error);
      
      const errorResult: EnhancedUploadResult = {
        success: false,
        totalProcessed: leads.length,
        successfulInserts: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        message: 'Upload failed',
        skippedDuplicates: 0
      };
      
      setUploadResult(errorResult);
      
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });

      return errorResult;
    } finally {
      setUploading(false);
      setCheckingDuplicates(false);
    }
  };

  const makeAdmin = async () => {
    try {
      const result = await promoteToAdmin();
      
      if (result.success) {
        toast({
          title: "Admin Promotion",
          description: "You have been promoted to admin",
        });
      } else {
        toast({
          title: "Promotion Failed",
          description: result.message,
          variant: "destructive"
        });
      }
      
      return result;
    } catch (error) {
      console.error('💥 [ENHANCED BYPASS] Admin promotion error:', error);
      toast({
        title: "Promotion Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      
      return { success: false, message: 'Promotion failed' };
    }
  };

  return {
    uploading,
    uploadResult,
    checkingDuplicates,
    uploadLeads,
    makeAdmin,
    clearResult: () => setUploadResult(null)
  };
};
