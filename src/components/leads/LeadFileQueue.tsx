
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, FileText, CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

interface QueuedLeadFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  results?: {
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
  };
}

interface LeadFileQueueProps {
  files: QueuedLeadFile[];
  onRemoveFile: (fileId: string) => void;
  processing: boolean;
}

const LeadFileQueue = ({ files, onRemoveFile, processing }: LeadFileQueueProps) => {
  const getStatusIcon = (status: QueuedLeadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: QueuedLeadFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="default">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-700">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No files queued for upload</p>
            <p className="text-sm">Add CSV or Excel files to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Upload Queue ({files.length} files)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {files.map((file) => (
          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex items-center space-x-2">
                {getStatusIcon(file.status)}
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.file.name}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{formatFileSize(file.file.size)}</span>
                  {file.results && (
                    <>
                      <span>•</span>
                      <span>{file.results.totalRows} rows</span>
                      <span>•</span>
                      <span className="text-green-600">{file.results.successfulImports} imported</span>
                      {file.results.errors > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600">{file.results.errors} errors</span>
                        </>
                      )}
                      {file.results.duplicates > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-600">{file.results.duplicates} duplicates</span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {getStatusBadge(file.status)}
              {!processing && file.status !== 'processing' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveFile(file.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default LeadFileQueue;
