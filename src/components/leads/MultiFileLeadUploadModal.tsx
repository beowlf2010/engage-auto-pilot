
import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Trash2, AlertCircle, FileText } from 'lucide-react';
import { useMultiFileLeadUpload } from '@/hooks/useMultiFileLeadUpload';
import LeadFileQueue from './LeadFileQueue';
import LeadBatchUploadResult from './LeadBatchUploadResult';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
    addFiles,
    removeFile,
    clearQueue,
    processBatch
  } = useMultiFileLeadUpload();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileErrors([]);
      
      // Check for VIN Solutions files or unsupported formats
      const errors: string[] = [];
      const validFiles: File[] = [];
      
      Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        
        // Check if it looks like a VIN Solutions export
        if (fileName.includes('vinsolutions') || fileName.includes('vin_solutions') || 
            fileName.includes('message') && (fileName.includes('export') || fileName.includes('log'))) {
          errors.push(`"${file.name}" appears to be a VIN Solutions message export. Please use the Message Import feature instead.`);
          return;
        }
        
        // Check file extension
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        
        if (!validExtensions.includes(fileExtension)) {
          errors.push(`"${file.name}" has an unsupported format. Please use CSV or Excel files.`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (errors.length > 0) {
        setFileErrors(errors);
      }
      
      if (validFiles.length > 0) {
        const fileList = new DataTransfer();
        validFiles.forEach(file => fileList.items.add(file));
        addFiles(fileList.files);
      }
    }
    // Reset the input so the same files can be selected again if needed
    event.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setFileErrors([]);
      
      // Check for VIN Solutions files or unsupported formats
      const errors: string[] = [];
      const validFiles: File[] = [];
      
      Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        
        // Check if it looks like a VIN Solutions export
        if (fileName.includes('vinsolutions') || fileName.includes('vin_solutions') || 
            fileName.includes('message') && (fileName.includes('export') || fileName.includes('log'))) {
          errors.push(`"${file.name}" appears to be a VIN Solutions message export. Please use the Message Import feature instead.`);
          return;
        }
        
        // Check file extension
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
        
        if (!validExtensions.includes(fileExtension)) {
          errors.push(`"${file.name}" has an unsupported format. Please use CSV or Excel files.`);
          return;
        }
        
        validFiles.push(file);
      });
      
      if (errors.length > 0) {
        setFileErrors(errors);
      }
      
      if (validFiles.length > 0) {
        const fileList = new DataTransfer();
        validFiles.forEach(file => fileList.items.add(file));
        addFiles(fileList.files);
      }
    }
  }, [addFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleProcessAll = async () => {
    const result = await processBatch();
    // Call onSuccess if ANY leads were successfully imported, not just when all files succeed
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
    // Trigger another refresh when user clicks "View Imported Leads"
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
          {/* Error Messages */}
          {fileErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {fileErrors.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* VIN Solutions Import Notice */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Looking to import VIN Solutions message logs?</strong> Use the dedicated Message Import feature 
              in the sidebar navigation or visit the Message Export page for proper VIN Solutions file processing.
            </AlertDescription>
          </Alert>

          {/* File Drop Zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop lead files here or click to browse
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Supports CSV and Excel files (.csv, .xlsx, .xls) for lead data only
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="lead-file-input"
              disabled={processing}
            />
            <Button asChild disabled={processing}>
              <label htmlFor="lead-file-input" className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Select Lead Files
              </label>
            </Button>
          </div>

          {/* File Queue */}
          <LeadFileQueue
            files={queuedFiles}
            onRemoveFile={removeFile}
            processing={processing}
          />

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Lead Upload Information</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Each file will be processed independently as lead data</li>
              <li>• Duplicate leads will be automatically detected and skipped</li>
              <li>• Phone numbers will be prioritized: Cell → Day → Evening</li>
              <li>• Multi-sheet Excel files require individual processing</li>
              <li>• For VIN Solutions message imports, use the Message Import feature</li>
            </ul>
          </div>
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
                  Process All ({queuedFiles.length})
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
