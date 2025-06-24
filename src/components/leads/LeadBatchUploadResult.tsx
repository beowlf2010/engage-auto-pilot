
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, FileText, Users } from 'lucide-react';

interface BatchLeadUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    error?: string;
  }>;
}

interface LeadBatchUploadResultProps {
  result: BatchLeadUploadResult;
  onClose: () => void;
  onViewLeads?: () => void;
}

const LeadBatchUploadResult = ({ result, onClose, onViewLeads }: LeadBatchUploadResultProps) => {
  const hasErrors = result.failedFiles > 0 || result.failedLeads > 0;
  const hasDuplicates = result.duplicateLeads > 0;
  
  return (
    <Card className={`${
      hasErrors ? 'bg-red-50 border-red-200' : 
      hasDuplicates ? 'bg-yellow-50 border-yellow-200' : 
      'bg-green-50 border-green-200'
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {hasErrors ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          <span className={hasErrors ? 'text-red-800' : hasDuplicates ? 'text-yellow-800' : 'text-green-800'}>
            {hasErrors ? 'Batch upload completed with errors' : 
             hasDuplicates ? 'Batch upload completed with duplicates' : 
             'Batch upload completed successfully!'}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <FileText className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold text-gray-900">{result.totalFiles}</div>
            <div className="text-xs text-gray-600">Total Files</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <Users className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold text-gray-900">{result.successfulLeads}</div>
            <div className="text-xs text-gray-600">Leads Imported</div>
          </div>
          
          {result.failedLeads > 0 && (
            <div className="text-center p-3 bg-white rounded-lg border">
              <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-500" />
              <div className="text-2xl font-bold text-gray-900">{result.failedLeads}</div>
              <div className="text-xs text-gray-600">Failed Leads</div>
            </div>
          )}
          
          {result.duplicateLeads > 0 && (
            <div className="text-center p-3 bg-white rounded-lg border">
              <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <div className="text-2xl font-bold text-gray-900">{result.duplicateLeads}</div>
              <div className="text-xs text-gray-600">Duplicates Skipped</div>
            </div>
          )}
        </div>

        {/* File Results */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">File Processing Results:</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {result.results.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border text-sm">
                <div className="flex items-center space-x-2">
                  {file.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium truncate">{file.fileName}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {file.status === 'success' ? (
                    `${file.records} leads imported`
                  ) : (
                    file.error || 'Failed'
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result.successfulLeads > 0 && (
            <Button onClick={onViewLeads || onClose}>
              View Imported Leads
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadBatchUploadResult;
