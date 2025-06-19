
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
  Play,
  Loader2
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
      case 'processing': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  const pendingCount = fileQueue.filter(f => f.status === 'pending').length;

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
                : processing
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                processing ? 'bg-gray-100' : 'bg-blue-100'
              }`}>
                {processing ? (
                  <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                )}
              </div>
              
              <div>
                <p className="text-lg font-medium text-slate-800 mb-2">
                  {processing ? 'Processing files...' : 'Drop multiple files here'}
                </p>
                <p className="text-slate-600 mb-4">
                  {processing ? 'Please wait while files are being processed' : 'or click to browse and select files'}
                </p>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processing}
                  className={processing ? 'opacity-50 cursor-not-allowed' : ''}
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
                  disabled={processing}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg">
                File Queue ({fileQueue.length} files)
                {pendingCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-600">
                    • {pendingCount} pending
                  </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={processAllFiles}
                  disabled={processing || pendingCount === 0}
                  className="flex items-center space-x-2"
                  size="sm"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>Process All ({pendingCount})</span>
                </Button>
                <Button 
                  onClick={clearAll} 
                  variant="outline" 
                  size="sm"
                  disabled={processing}
                  className="flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {fileQueue.map((queuedFile) => {
                const FileIcon = getFileIcon(queuedFile.file.name);
                
                return (
                  <Card key={queuedFile.id} className="border border-slate-200">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* File Info Row */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <FileIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm text-slate-900 truncate">
                                  {queuedFile.file.name}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                  {(queuedFile.file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getStatusIcon(queuedFile.status)}
                                <Button
                                  onClick={() => removeFile(queuedFile.id)}
                                  variant="ghost"
                                  size="sm"
                                  disabled={queuedFile.status === 'processing'}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Condition and Status Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">Type:</span>
                            <Select
                              value={queuedFile.condition}
                              onValueChange={(value: 'new' | 'used' | 'gm_global') => 
                                updateFileCondition(queuedFile.id, value)
                              }
                              disabled={queuedFile.status !== 'pending'}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="used">Used</SelectItem>
                                <SelectItem value="gm_global">GM Global</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Badge 
                            className={`${getConditionColor(queuedFile.condition)} text-xs`}
                            variant="outline"
                          >
                            {queuedFile.condition === 'gm_global' ? 'GM Global' : 
                             queuedFile.condition.charAt(0).toUpperCase() + queuedFile.condition.slice(1)}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        {queuedFile.status === 'processing' && queuedFile.progress !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Processing...</span>
                              <span className="text-slate-600">{queuedFile.progress}%</span>
                            </div>
                            <Progress value={queuedFile.progress} className="h-2" />
                          </div>
                        )}

                        {/* Error Display */}
                        {queuedFile.error && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-2">
                            <p className="text-xs text-red-700">{queuedFile.error}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
