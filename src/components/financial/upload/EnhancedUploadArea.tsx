import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  dealsProcessed?: number;
}

interface EnhancedUploadAreaProps {
  onFilesSelected: (files: QueuedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  onProcessFiles: () => void;
  queuedFiles: QueuedFile[];
  uploading: boolean;
}

const EnhancedUploadArea = ({ 
  onFilesSelected, 
  onFileRemove, 
  onProcessFiles,
  queuedFiles,
  uploading 
}: EnhancedUploadAreaProps) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input value
    e.target.value = '';
  };

  const handleFiles = (files: FileList) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const newQueuedFiles: QueuedFile[] = [];

    Array.from(files).forEach(file => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (validExtensions.includes(fileExtension)) {
        newQueuedFiles.push({
          id: Date.now() + Math.random().toString(),
          file,
          status: 'pending'
        });
      }
    });

    if (newQueuedFiles.length > 0) {
      onFilesSelected(newQueuedFiles);
    }
  };

  const getStatusIcon = (status: QueuedFile['status']) => {
    switch (status) {
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileSpreadsheet className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: QueuedFile['status']) => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const pendingFiles = queuedFiles.filter(f => f.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload DMS Reports</span>
        </CardTitle>
        <CardDescription>
          Drag and drop multiple Excel or CSV files or click to browse
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50 scale-102' 
              : uploading
              ? 'border-gray-300 bg-gray-50'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              dragActive ? 'bg-blue-200' : 'bg-blue-100'
            }`}>
              <FileSpreadsheet className={`w-8 h-8 ${
                dragActive ? 'text-blue-700' : 'text-blue-600'
              }`} />
            </div>
            
            <div>
              <p className="text-lg font-medium text-slate-800 mb-2">
                {dragActive ? 'Drop files here' : 'Drop DMS reports here'}
              </p>
              <p className="text-slate-600 mb-4">
                or click to browse for Excel or CSV files (.xlsx, .xls, .csv)
              </p>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mx-auto"
              >
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* File Queue */}
        {queuedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-700">
                Files ({queuedFiles.length})
              </h4>
              {pendingFiles.length > 0 && (
                <Button 
                  onClick={onProcessFiles}
                  disabled={uploading}
                  size="sm"
                >
                  Process All ({pendingFiles.length})
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {queuedFiles.map((queuedFile) => (
                <div
                  key={queuedFile.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(queuedFile.status)}`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getStatusIcon(queuedFile.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {queuedFile.file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(queuedFile.file.size / 1024).toFixed(1)} KB
                        {queuedFile.dealsProcessed && (
                          <span className="ml-2">• {queuedFile.dealsProcessed} deals processed</span>
                        )}
                      </p>
                      {queuedFile.error && (
                        <p className="text-xs text-red-600 mt-1">{queuedFile.error}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={
                      queuedFile.status === 'success' ? 'default' :
                      queuedFile.status === 'error' ? 'destructive' :
                      queuedFile.status === 'processing' ? 'secondary' : 'outline'
                    }>
                      {queuedFile.status}
                    </Badge>
                    
                    {queuedFile.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileRemove(queuedFile.id)}
                        disabled={uploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUploadArea;
