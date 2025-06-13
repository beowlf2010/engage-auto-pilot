
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, FileSpreadsheet, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BatchResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDeals: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'error';
    dealsProcessed?: number;
    error?: string;
  }>;
}

interface BatchUploadResultProps {
  result: BatchResult;
}

const BatchUploadResult = ({ result }: BatchUploadResultProps) => {
  const successRate = result.totalFiles > 0 ? (result.successfulFiles / result.totalFiles) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Batch Upload Results</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{result.totalFiles}</div>
            <div className="text-sm text-slate-600">Total Files</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{result.successfulFiles}</div>
            <div className="text-sm text-slate-600">Successful</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{result.failedFiles}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{result.totalDeals}</div>
            <div className="text-sm text-slate-600">Total Deals</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Success Rate</span>
            <span className="text-sm font-bold text-slate-800">{successRate.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>

        {/* Individual File Results */}
        <div className="space-y-2">
          <h4 className="font-medium text-slate-700">File Details</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {result.results.map((fileResult, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  fileResult.status === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {fileResult.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <FileSpreadsheet className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {fileResult.fileName}
                    </p>
                    {fileResult.dealsProcessed && (
                      <p className="text-xs text-slate-500">
                        {fileResult.dealsProcessed} deals processed
                      </p>
                    )}
                    {fileResult.error && (
                      <p className="text-xs text-red-600 mt-1">{fileResult.error}</p>
                    )}
                  </div>
                </div>
                
                <Badge variant={fileResult.status === 'success' ? 'default' : 'destructive'}>
                  {fileResult.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchUploadResult;
