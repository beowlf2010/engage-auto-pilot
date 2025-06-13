
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  X, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Play
} from "lucide-react";

export interface QueuedFile {
  id: string;
  file: File;
  condition: 'new' | 'used' | 'gm_global';
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface DragDropFileQueueProps {
  onFilesProcessed: (files: QueuedFile[]) => void;
  onFileProcess: (file: QueuedFile) => Promise<void>;
  processing: boolean;
}

const DragDropFileQueue = ({ onFilesProcessed, onFileProcess, processing }: DragDropFileQueueProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files: File[]) => {
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const newFiles: QueuedFile[] = [];

    files.forEach(file => {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (validExtensions.includes(fileExtension) && file.size <= 10 * 1024 * 1024) {
        // Auto-detect condition based on filename patterns
        let suggestedCondition: 'new' | 'used' | 'gm_global' = 'used';
        const fileName = file.name.toLowerCase();
        
        if (fileName.includes('new') || fileName.includes('factory')) {
          suggestedCondition = 'new';
        } else if (fileName.includes('gm') || fileName.includes('global') || fileName.includes('order')) {
          suggestedCondition = 'gm_global';
        }

        newFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          condition: suggestedCondition,
          status: 'pending'
        });
      }
    });

    setFileQueue(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== id));
  };

  const updateFileCondition = (id: string, condition: 'new' | 'used' | 'gm_global') => {
    setFileQueue(prev => prev.map(f => f.id === id ? { ...f, condition } : f));
  };

  const clearAll = () => {
    setFileQueue([]);
  };

  const processAllFiles = async () => {
    const pendingFiles = fileQueue.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      setFileQueue(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f
      ));

      try {
        await onFileProcess(file);
        setFileQueue(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f
        ));
      } catch (error) {
        setFileQueue(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Processing failed' 
          } : f
        ));
      }
    }

    onFilesProcessed(fileQueue);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return ext === '.csv' ? FileText : FileSpreadsheet;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800 border-green-300';
      case 'used': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'gm_global': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing': return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5" />
            <span>Upload Inventory Files</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-8 h-8 text-blue-600" />
              </div>
              
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  Drop multiple files here
                </p>
                <p className="text-slate-600 mb-4">
                  or click to browse and select files
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>Supported: CSV, Excel (.xlsx, .xls)</div>
                <div>Max size: 10MB per file</div>
                <div>Multiple files supported</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Queue */}
      {fileQueue.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>File Queue ({fileQueue.length})</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={processAllFiles}
                  disabled={processing || fileQueue.filter(f => f.status === 'pending').length === 0}
                  className="flex items-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Process All</span>
                </Button>
                <Button onClick={clearAll} variant="outline" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fileQueue.map((queuedFile) => {
                const FileIcon = getFileIcon(queuedFile.file.name);
                
                return (
                  <div key={queuedFile.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <FileIcon className="w-5 h-5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {queuedFile.file.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(queuedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {queuedFile.status === 'processing' && queuedFile.progress !== undefined && (
                          <Progress value={queuedFile.progress} className="w-full mt-1" />
                        )}
                        {queuedFile.error && (
                          <div className="text-xs text-red-600 mt-1">{queuedFile.error}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Select
                        value={queuedFile.condition}
                        onValueChange={(value: 'new' | 'used' | 'gm_global') => 
                          updateFileCondition(queuedFile.id, value)
                        }
                        disabled={queuedFile.status !== 'pending'}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="gm_global">GM Global</SelectItem>
                        </SelectContent>
                      </Select>

                      <Badge className={getConditionColor(queuedFile.condition)}>
                        {queuedFile.condition === 'gm_global' ? 'GM Global' : 
                         queuedFile.condition.charAt(0).toUpperCase() + queuedFile.condition.slice(1)}
                      </Badge>

                      <div className="flex items-center space-x-2">
                        {getStatusIcon(queuedFile.status)}
                        <Button
                          onClick={() => removeFile(queuedFile.id)}
                          variant="ghost"
                          size="sm"
                          disabled={queuedFile.status === 'processing'}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DragDropFileQueue;
