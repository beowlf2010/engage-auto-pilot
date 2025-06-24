
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, FileText, Users, Eye } from 'lucide-react';

interface BatchUploadResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalLeads: number;
  successfulLeads: number;
  failedLeads: number;
  duplicateLeads: number;
  updatedLeads?: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    records?: number;
    updates?: number;
    error?: string;
  }>;
}

interface LeadBatchUploadResultProps {
  result: BatchUploadResult;
  onClose: () => void;
  onViewLeads: () => void;
}

const LeadBatchUploadResult = ({ result, onClose, onViewLeads }: LeadBatchUploadResultProps) => {
  const hasErrors = result.failedFiles > 0 || result.failedLeads > 0;
  const hasSuccesses = result.successfulFiles > 0 && result.successfulLeads > 0;
  const hasUpdates = (result.updatedLeads || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {hasErrors && !hasSuccesses ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <span>
              {hasErrors && !hasSuccesses 
                ? 'Upload Failed' 
                : hasErrors 
                ? 'Upload Completed with Issues' 
                : 'Upload Completed Successfully'
              }
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.totalFiles}</div>
              <div className="text-sm text-gray-600">Total Files</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.successfulLeads}</div>
              <div className="text-sm text-gray-600">Leads Imported</div>
            </div>
            {hasUpdates && (
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.updatedLeads || 0}</div>
                <div className="text-sm text-gray-600">Leads Updated</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.duplicateLeads}</div>
              <div className="text-sm text-gray-600">Duplicates Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.failedFiles}</div>
              <div className="text-sm text-gray-600">Failed Files</div>
            </div>
          </div>

          {hasSuccesses && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">
                  Successfully imported {result.successfulLeads} leads
                  {hasUpdates && ` and updated ${result.updatedLeads} existing leads`} from {result.successfulFiles} files
                </span>
              </div>
            </div>
          )}

          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">
                  {result.failedFiles} files failed to process
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File-by-File Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>File Processing Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.results.map((fileResult, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {fileResult.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <FileText className="h-4 w-4 text-gray-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileResult.fileName}
                    </p>
                    {fileResult.status === 'success' && (
                      <p className="text-xs text-green-600">
                        {fileResult.records || 0} leads imported
                        {(fileResult.updates || 0) > 0 && `, ${fileResult.updates} updated`}
                      </p>
                    )}
                    {fileResult.status === 'error' && fileResult.error && (
                      <p className="text-xs text-red-600">
                        {fileResult.error}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Badge 
                    variant={fileResult.status === 'success' ? 'default' : 'destructive'}
                    className={fileResult.status === 'success' ? 'bg-green-100 text-green-700' : ''}
                  >
                    {fileResult.status === 'success' ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span>✓ Duplicate detection applied</span>
            <span>✓ AI strategy calculated</span>
            <span>✓ Upload history tracked</span>
            {hasUpdates && <span>✓ Existing leads updated</span>}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {hasSuccesses && (
            <Button onClick={onViewLeads} className="bg-blue-600 hover:bg-blue-700">
              <Users className="h-4 w-4 mr-2" />
              View {hasUpdates ? 'Imported & Updated' : 'Imported'} Leads
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadBatchUploadResult;
