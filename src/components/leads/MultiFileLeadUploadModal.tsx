
import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Shield } from 'lucide-react';
import { useMultiFileLeadUpload } from '@/hooks/useMultiFileLeadUpload';
import { promoteToAdmin } from '@/utils/leadOperations/rlsBypassUploader';
import { toast } from '@/hooks/use-toast';
import LeadFileQueue from './LeadFileQueue';
import LeadBatchUploadResult from './LeadBatchUploadResult';
import EnhancedCSVUploadGuard from '@/components/upload-leads/EnhancedCSVUploadGuard';
import FileUploadArea from './upload/FileUploadArea';
import FileValidation, { validateFiles } from './upload/FileValidation';
import UploadSettings from './upload/UploadSettings';
import UploadInfoPanel from './upload/UploadInfoPanel';

interface MultiFileLeadUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MultiFileLeadUploadModal = ({ isOpen, onClose, onSuccess }: MultiFileLeadUploadModalProps) => {
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [promotingToAdmin, setPromotingToAdmin] = useState(false);
  const {
    queuedFiles,
    processing,
    batchResult,
    updateExistingLeads,
    setUpdateExistingLeads,
    addFiles,
    removeFile,
    clearQueue,
    processBatch
  } = useMultiFileLeadUpload();

  const handleFilesSelected = useCallback((files: FileList) => {
    setFileErrors([]);
    
    // Validate files
    const errors = validateFiles(Array.from(files));
    
    if (errors.length > 0) {
      setFileErrors(errors);
    }
    
    // Filter out invalid files
    const validFiles = Array.from(files).filter(file => {
      const fileName = file.name.toLowerCase();
      
      // Check for VIN Solutions files
      if (fileName.includes('vinsolutions') || fileName.includes('vin_solutions') || 
          fileName.includes('message') && (fileName.includes('export') || fileName.includes('log'))) {
        return false;
      }
      
      // Check file extension
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      
      return validExtensions.includes(fileExtension);
    });
    
    if (validFiles.length > 0) {
      const fileList = new DataTransfer();
      validFiles.forEach(file => fileList.items.add(file));
      addFiles(fileList.files);
    }
  }, [addFiles]);

  const handleMakeAdmin = async () => {
    setPromotingToAdmin(true);
    try {
      console.log('🔄 [MULTI-FILE] Ensuring admin privileges for bypass upload');
      const result = await promoteToAdmin();
      
      if (result.success) {
        console.log('✅ [MULTI-FILE] Admin privileges confirmed');
        toast({
          title: "Admin Access",
          description: result.message.includes('already') ? "Admin privileges confirmed" : "Admin privileges granted",
        });
      } else {
        console.error('❌ [MULTI-FILE] Admin promotion failed:', result.message);
        toast({
          title: "Access Issue",
          description: result.message,
          variant: "destructive"
        });
      }
      return result.success;
    } catch (error) {
      console.error('💥 [MULTI-FILE] Admin promotion error:', error);
      toast({
        title: "Access Error",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      return false;
    } finally {
      setPromotingToAdmin(false);
    }
  };

  const handleProcessAll = async () => {
    console.log('🚀 [MULTI-FILE] Starting batch processing for', queuedFiles.length, 'files');
    
    // First ensure admin privileges for bypass functionality
    const adminSuccess = await handleMakeAdmin();
    
    if (!adminSuccess) {
      console.error('❌ [MULTI-FILE] Cannot proceed without admin privileges');
      toast({
        title: "Upload Blocked",
        description: "Admin privileges required for bypass upload",
        variant: "destructive"
      });
      return;
    }
    
    // Then process the batch
    console.log('📤 [MULTI-FILE] Admin privileges confirmed, processing files...');
    const result = await processBatch();
    
    console.log('✅ [MULTI-FILE] Batch processing completed:', {
      successfulLeads: result.successfulLeads,
      failedLeads: result.failedLeads,
      totalFiles: result.totalFiles
    });
    
    if (result.successfulLeads > 0 && onSuccess) {
      onSuccess();
    }
  };

  const handleClose = () => {
    if (!processing) {
      clearQueue();
      setFileErrors([]);
      onClose();
    }
  };

  const handleViewLeads = () => {
    if (onSuccess) {
      onSuccess();
    }
    handleClose();
  };

  // Show results if batch processing is complete
  if (batchResult) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <LeadBatchUploadResult
              result={batchResult}
              onClose={handleClose}
              onViewLeads={handleViewLeads}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Multi-File Lead Upload (Bypass Mode)</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Enhanced Upload Guard */}
          <EnhancedCSVUploadGuard onRetry={() => window.location.reload()}>
            {/* Error Messages */}
            <FileValidation errors={fileErrors} />

            {/* Info Panel */}
            <UploadInfoPanel updateExistingLeads={updateExistingLeads} />

            {/* Bypass Upload Notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-800">Bypass Upload Mode</h3>
                  <p className="text-sm text-orange-600">
                    This modal uses the bypass upload system to avoid RLS validation issues.
                    Files will be processed and uploaded directly to the database.
                  </p>
                </div>
              </div>
            </div>

            {/* Update Existing Leads Option */}
            <UploadSettings
              updateExistingLeads={updateExistingLeads}
              onUpdateExistingLeadsChange={setUpdateExistingLeads}
              disabled={processing}
            />

            {/* File Upload Area */}
            <FileUploadArea
              onFilesSelected={handleFilesSelected}
              processing={processing}
            />

            {/* File Queue */}
            <LeadFileQueue
              files={queuedFiles}
              onRemoveFile={removeFile}
              processing={processing}
            />
          </EnhancedCSVUploadGuard>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-2">
            {queuedFiles.length > 0 && !processing && (
              <Button
                variant="outline"
                onClick={clearQueue}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Queue
              </Button>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessAll}
              disabled={queuedFiles.length === 0 || processing || promotingToAdmin}
              className="min-w-32 bg-orange-600 hover:bg-orange-700"
            >
              {processing || promotingToAdmin ? (
                <>Processing...</>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Bypass Upload ({queuedFiles.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiFileLeadUploadModal;
