
import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, Plus } from 'lucide-react';

interface FileUploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  processing: boolean;
}

const FileUploadArea = ({ onFilesSelected, processing }: FileUploadAreaProps) => {
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset the input so the same files can be selected again if needed
    event.target.value = '';
  }, [onFilesSelected]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return (
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
  );
};

export default FileUploadArea;
