
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertTriangle, CheckCircle, Wrench, TrendingUp, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  analyzeUsedInventoryIssues, 
  restoreUsedInventoryFromRecentUploads,
  validateUploadProcessing,
  type UsedInventoryAnalysis 
} from '@/services/inventory/usedInventoryRestoration';

const UsedInventoryDiagnostics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [analysis, setAnalysis] = useState<UsedInventoryAnalysis | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      console.log('🔍 Running enhanced used inventory diagnostics...');
      const result = await analyzeUsedInventoryIssues();
      setAnalysis(result);
      
      if (result.issuesFound.length > 0) {
        toast({
          title: "Issues Detected",
          description: `Found ${result.issuesFound.length} issues that need attention`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "System Healthy",
          description: "No inventory issues detected",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        title: "Diagnostics Failed",
        description: "Error running inventory analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreInventory = async () => {
    setRestoring(true);
    try {
      console.log('🔧 Starting enhanced inventory restoration...');
      const result = await restoreUsedInventoryFromRecentUploads();
      
      if (result.restored > 0) {
        toast({
          title: "Restoration Complete",
          description: `Successfully restored ${result.restored} used vehicles to available status`,
          variant: "default"
        });
      } else {
        toast({
          title: "No Action Needed",
          description: "No vehicles needed restoration",
          variant: "default"
        });
      }

      // Re-run diagnostics to show updated state
      await runDiagnostics();
    } catch (error) {
      console.error('Restoration failed:', error);
      toast({
        title: "Restoration Failed",
        description: "Error restoring inventory. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setRestoring(false);
    }
  };

  const getHealthStatus = () => {
    if (!analysis) return { color: 'gray', text: 'Unknown', icon: RefreshCw };
    
    if (analysis.issuesFound.length === 0) {
      return { color: 'green', text: 'Healthy', icon: CheckCircle };
    } else if (analysis.issuesFound.length <= 2) {
      return { color: 'yellow', text: 'Warning', icon: AlertTriangle };
    } else {
      return { color: 'red', text: 'Critical', icon: AlertTriangle };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="w-full border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-600" />
          Enhanced Used Inventory Diagnostics
          <Badge 
            variant={healthStatus.color === 'green' ? 'default' : 'destructive'}
            className={`ml-auto ${
              healthStatus.color === 'green' ? 'bg-green-100 text-green-800' : 
              healthStatus.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}
          >
            <healthStatus.icon className="h-3 w-3 mr-1" />
            {healthStatus.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
            className="flex-1 min-w-[140px]"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Diagnostics
          </Button>
          
          {analysis && analysis.issuesFound.length > 0 && (
            <Button 
              onClick={restoreInventory} 
              disabled={restoring}
              variant="default"
              className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-700"
            >
              {restoring ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Wrench className="h-4 w-4 mr-2" />}
              Restore Inventory
            </Button>
          )}
        </div>

        {analysis && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-blue-600">{analysis.totalUsedVehicles}</div>
                <div className="text-sm text-gray-600">Total Used</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-green-600">{analysis.availableUsedVehicles}</div>
                <div className="text-sm text-gray-600">Available</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-2xl font-bold text-red-600">{analysis.soldUsedVehicles}</div>
                <div className="text-sm text-gray-600">Marked Sold</div>
              </div>
            </div>

            {/* Recent Uploads Section */}
            <div className="bg-white rounded-lg p-4 border">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent Uploads Analysis
              </h4>
              <div className="space-y-2">
                {analysis.recentUploads.slice(0, 3).map((upload, index) => (
                  <div key={upload.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div>
                      <div className="font-medium text-sm">{upload.filename}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(upload.created_at).toLocaleDateString()} - {upload.vehicle_count} vehicles
                      </div>
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                      {index === 0 ? "Latest" : `${index + 1} ago`}
                    </Badge>
                  </div>
                ))}
                {analysis.recentUploads.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    No recent used inventory uploads found
                  </div>
                )}
              </div>
            </div>

            {/* Issues Section */}
            {analysis.issuesFound.length > 0 ? (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  Issues Detected ({analysis.issuesFound.length})
                </h4>
                <div className="space-y-2">
                  {analysis.issuesFound.map((issue, index) => (
                    <div key={index} className="p-3 bg-white border border-red-200 rounded text-red-800 text-sm">
                      <strong>Issue {index + 1}:</strong> {issue}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">All Systems Operational</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  No issues detected with used inventory. Upload and cleanup processes are working correctly.
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-blue-800">System Status</h4>
              <div className="text-sm text-blue-700">
                <p>✅ Enhanced validation active</p>
                <p>✅ Upload verification enabled</p>
                <p>✅ Cleanup protection in place</p>
                <p className="mt-2 font-medium">
                  Run diagnostics daily to monitor inventory health and catch issues early.
                </p>
              </div>
            </div>
          </div>
        )}

        {!analysis && (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>Click "Run Diagnostics" to analyze your used inventory system</p>
            <p className="text-sm mt-1">This will check for upload issues and data inconsistencies</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsedInventoryDiagnostics;
