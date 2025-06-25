
import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Upload, Trash2 } from 'lucide-react';
import { useMultiFileLeadUpload } from '@/hooks/useMultiFileLeadUpload';
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

  const handleProcessAll = async () => {
    const result = await processBatch();
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
          <DialogTitle>Multi-File Lead Upload</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Enhanced Upload Guard */}
          <EnhancedCSVUploadGuard onRetry={() => window.location.reload()}>
            {/* Error Messages */}
            <FileValidation errors={fileErrors} />

            {/* Info Panel */}
            <UploadInfoPanel updateExistingLeads={updateExistingLeads} />

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
              disabled={queuedFiles.length === 0 || processing}
              className="min-w-32"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {updateExistingLeads ? 'Process & Update' : 'Process All'} ({queuedFiles.length})
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
