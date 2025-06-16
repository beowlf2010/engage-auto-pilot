
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMessageExport } from '@/hooks/useMessageExport';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface VINImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

const VINImportModal = ({ isOpen, onClose, onImportSuccess }: VINImportModalProps) => {
  const { importFromFile, isLoading } = useMessageExport();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportName, setExportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!exportName) {
        setExportName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !exportName.trim()) return;
    
    try {
      await importFromFile(selectedFile, exportName.trim());
      onImportSuccess();
      handleClose();
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setExportName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import from VIN</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select VIN Export File (JSON or Excel)</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".json,.xlsx,.xls"
              onChange={handleFileSelect}
              ref={fileInputRef}
            />
          </div>

          {selectedFile && (
            <>
              <div className="space-y-2">
                <Label htmlFor="export-name">Import Name</Label>
                <Input
                  id="export-name"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="Enter a name for this import"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Note:</strong> This will import leads and messages from your VIN export file. 
                Existing leads will be matched by phone/email. Supports both JSON and Excel formats.
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || !exportName.trim() || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" text="Importing..." />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VINImportModal;
