
import { useState } from 'react';
import { uploadLeadsWithRLSBypass, promoteToAdmin, BypassUploadResult } from '@/utils/leadOperations/rlsBypassUploader';
import { ProcessedLead } from '@/components/upload-leads/duplicateDetection';
import { toast } from '@/hooks/use-toast';

export const useBypassCSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BypassUploadResult | null>(null);

  const uploadLeads = async (leads: ProcessedLead[], uploadHistoryId?: string) => {
    setUploading(true);
    setUploadResult(null);

    try {
      console.log('🔄 [BYPASS HOOK] Starting upload process');
      
      const result = await uploadLeadsWithRLSBypass(leads, uploadHistoryId);
      
      setUploadResult(result);

      if (result.success) {
        toast({
          title: "Upload Successful",
          description: `${result.successfulInserts} leads uploaded successfully`,
        });
      } else {
        toast({
          title: "Upload Issues",
          description: `${result.successfulInserts} uploaded, ${result.errors.length} failed`,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('💥 [BYPASS HOOK] Upload error:', error);
      
      const errorResult: BypassUploadResult = {
        success: false,
        totalProcessed: 0,
        successfulInserts: 0,
        errors: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
        message: 'Upload failed'
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
      console.error('💥 [BYPASS HOOK] Admin promotion error:', error);
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
    uploadLeads,
    makeAdmin,
    clearResult: () => setUploadResult(null)
  };
};
