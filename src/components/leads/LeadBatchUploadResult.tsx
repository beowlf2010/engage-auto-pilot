
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Eye, FileText, Database } from 'lucide-react';

interface BatchUploadResult {
  totalFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    totalRows: number;
    successfulImports: number;
    errors: number;
    duplicates: number;
    errorDetails?: Array<{
      rowIndex: number;
      error: string;
      leadName?: string;
    }>;
  }>;
}

interface LeadBatchUploadResultProps {
  result: BatchUploadResult;
  onClose: () => void;
  onViewLeads: () => void;
}

const LeadBatchUploadResult = ({ result, onClose, onViewLeads }: LeadBatchUploadResultProps) => {
  const successRate = result.totalLeads > 0 ? (result.successfulLeads / result.totalLeads * 100).toFixed(1) : '0';
  const hasErrors = result.failedLeads > 0;
  const hasDuplicates = result.duplicateLeads > 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    if (result.successfulLeads === 0) return 'border-red-200 bg-red-50';
    if (hasErrors || hasDuplicates) return 'border-yellow-200 bg-yellow-50';
    return 'border-green-200 bg-green-50';
  };

  const getStatusTitle = () => {
    if (result.successfulLeads === 0) return 'Upload Failed';
    if (hasErrors || hasDuplicates) return 'Upload Completed with Issues';
    return 'Upload Successful';
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className={getStatusColor()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {result.successfulLeads === 0 ? (
              <XCircle className="h-6 w-6 text-red-500" />
            ) : hasErrors || hasDuplicates ? (
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            {getStatusTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{result.totalLeads}</div>
              <div className="text-sm text-gray-600">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.successfulLeads}</div>
              <div className="text-sm text-gray-600">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.failedLeads}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.duplicateLeads}</div>
              <div className="text-sm text-gray-600">Duplicates</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Success Rate: <span className="font-semibold">{successRate}%</span>
            </div>
            <Badge variant={result.successfulLeads > 0 ? 'default' : 'destructive'}>
              {result.totalFiles} file{result.totalFiles !== 1 ? 's' : ''} processed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* File Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          File Results
        </h3>
        
        {result.results.map((fileResult, index) => (
          <Card key={index} className="border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(fileResult.status)}
                  <span className="font-medium">{fileResult.fileName}</span>
                </div>
                <Badge variant={fileResult.status === 'success' ? 'default' : 'destructive'}>
                  {fileResult.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="ml-1 font-medium">{fileResult.totalRows}</span>
                </div>
                <div>
                  <span className="text-gray-600">Imported:</span>
                  <span className="ml-1 font-medium text-green-600">{fileResult.successfulImports}</span>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <span className="ml-1 font-medium text-red-600">{fileResult.errors}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duplicates:</span>
                  <span className="ml-1 font-medium text-yellow-600">{fileResult.duplicates}</span>
                </div>
              </div>

              {/* Error Details */}
              {fileResult.errorDetails && fileResult.errorDetails.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Error Details ({fileResult.errorDetails.length} errors)
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {fileResult.errorDetails.slice(0, 5).map((error, errorIndex) => (
                      <div key={errorIndex} className="text-sm text-red-700">
                        <span className="font-medium">Row {error.rowIndex}:</span>
                        {error.leadName && <span className="ml-1">({error.leadName})</span>}
                        <span className="ml-2">{error.error}</span>
                      </div>
                    ))}
                    {fileResult.errorDetails.length > 5 && (
                      <div className="text-sm text-red-600 italic">
                        + {fileResult.errorDetails.length - 5} more errors...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          {result.successfulLeads > 0 ? (
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {result.successfulLeads} leads successfully imported
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" />
              No leads were imported - check error details above
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result.successfulLeads > 0 && (
            <Button onClick={onViewLeads} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Leads
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadBatchUploadResult;
