
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, FileSpreadsheet, BarChart3, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { BatchUploadResult } from "@/hooks/useMultiFileUpload";

interface BatchUploadResultProps {
  result: BatchUploadResult;
}

const BatchUploadResultComponent = ({ result }: BatchUploadResultProps) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.totalFiles}</div>
              <div className="text-sm text-slate-600">Total Files</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.successfulFiles}</div>
              <div className="text-sm text-slate-600">Successful</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{result.totalRecords}</div>
              <div className="text-sm text-slate-600">Total Records</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.successfulRecords}</div>
              <div className="text-sm text-slate-600">Imported</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>File Processing Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.results.map((fileResult, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {fileResult.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">{fileResult.fileName}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {fileResult.records && (
                    <span className="text-sm text-slate-600">
                      {fileResult.records} records
                    </span>
                  )}
                  
                  <Badge 
                    variant={fileResult.status === 'success' ? 'default' : 'destructive'}
                    className={fileResult.status === 'success' ? 'bg-green-100 text-green-800' : ''}
                  >
                    {fileResult.status === 'success' ? 'Success' : 'Failed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Details */}
      {result.results.some(r => r.status === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>Error Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.results
                .filter(r => r.status === 'error')
                .map((fileResult, index) => (
                  <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                    <div className="font-medium text-red-800">{fileResult.fileName}</div>
                    <div className="text-sm text-red-600 mt-1">{fileResult.error}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Actions */}
      {result.successfulFiles > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-medium text-green-800 mb-2">Batch Upload Complete!</h3>
                <p className="text-sm text-green-600">
                  {result.successfulFiles} files processed successfully with {result.successfulRecords} records imported
                </p>
              </div>
              
              <div className="flex justify-center space-x-3">
                <Link to="/inventory-dashboard">
                  <Button size="sm" className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>View Inventory Dashboard</span>
                  </Button>
                </Link>
                <Link to="/rpo-insights">
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Analyze RPO Performance</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchUploadResultComponent;
