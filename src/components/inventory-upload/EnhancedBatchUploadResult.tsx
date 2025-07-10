
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Clock, Database } from "lucide-react";
import type { EnhancedBatchUploadResult } from "@/hooks/useEnhancedMultiFileUpload";

interface EnhancedBatchUploadResultProps {
  result: EnhancedBatchUploadResult;
}

const EnhancedBatchUploadResult = ({ result }: EnhancedBatchUploadResultProps) => {
  const successRate = result.totalFiles > 0 ? (result.successfulFiles / result.totalFiles) * 100 : 0;
  
  const getReportTypeBadge = (reportType?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'new_car_main_view': 'default',
      'gm_global': 'secondary',
      'sales_report': 'outline',
      'merch_inv_view': 'default'
    };
    
    return (
      <Badge variant={variants[reportType || ''] || 'outline'} className="text-xs">
        {reportType?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span>Enhanced Upload Results</span>
          <Badge variant={successRate === 100 ? "default" : "secondary"}>
            {successRate.toFixed(0)}% Success Rate
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{result.successfulRecords}</div>
            <div className="text-sm text-slate-600">New Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{result.updatedRecords || 0}</div>
            <div className="text-sm text-slate-600">Updated Records</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{result.skippedRecords || 0}</div>
            <div className="text-sm text-slate-600">Skipped Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{result.duplicatesDetected}</div>
            <div className="text-sm text-slate-600">Total Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-600">{result.vehicleHistoryEntries}</div>
            <div className="text-sm text-slate-600">History Entries</div>
          </div>
          {result.failedRecords > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.failedRecords}</div>
              <div className="text-sm text-slate-600">Errors</div>
            </div>
          )}
        </div>

        {/* File Results */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>File Processing Details</span>
          </h3>
          
          <div className="space-y-2">
            {result.results.map((fileResult, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {fileResult.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium text-slate-800">{fileResult.fileName}</div>
                    {fileResult.error && (
                      <div className="text-sm text-red-600">{fileResult.error}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {fileResult.reportType && getReportTypeBadge(fileResult.reportType)}
                  {fileResult.records && (
                    <Badge variant="outline" className="text-xs">
                      {fileResult.records} records
                    </Badge>
                  )}
                  {fileResult.duplicates && fileResult.duplicates > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {fileResult.duplicates} duplicates
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Features Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Enhanced Processing Applied</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
            <div>• Smart report type detection</div>
            <div>• Vehicle history tracking</div>
            <div>• Automatic duplicate detection</div>
            <div>• Data quality validation</div>
            <div>• Cross-report vehicle matching</div>
            <div>• Status transition tracking</div>
          </div>
        </div>

        {result.duplicatesDetected > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-800 mb-2">Duplicate Handling Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-orange-700">
              <div>
                <strong>Strategy Used:</strong> {result.duplicateStrategy || 'Skip duplicates'}
              </div>
              <div>
                <strong>Duplicates Found:</strong> {result.duplicatesDetected}
              </div>
              <div>
                <strong>Action Taken:</strong> {
                  result.duplicateStrategy === 'skip' ? `${result.skippedRecords || 0} skipped` :
                  result.duplicateStrategy === 'update' ? `${result.updatedRecords || 0} updated` :
                  'Replaced with new data'
                }
              </div>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              All duplicate information has been recorded in the vehicle history system for audit purposes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedBatchUploadResult;
